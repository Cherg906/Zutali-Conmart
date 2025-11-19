import json
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient, APITestCase

from api.models import Subscription, SubscriptionPlan


class SubscriptionPaymentTests(APITestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.user = self.user_model.objects.create_user(
            username="testuser",
            password="password123",
            email="user@example.com",
            tier="free",
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        self.plan = SubscriptionPlan.objects.create(
            code="standard_user",
            role="user",
            tier="standard",
            display_name="Standard User",
            amount=50,
            currency="ETB",
        )

    def test_initialize_payment_creates_transaction(self):
        url = reverse("initialize-subscription-payment")
        response = self.client.post(url, {"plan_code": self.plan.code}, format="json")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("checkout_url", data)
        self.assertIn("tx_ref", data)
        subscription = Subscription.objects.get(user=self.user)
        self.assertEqual(subscription.plan, self.plan)
        self.assertEqual(subscription.status, "pending")

    def test_callback_activates_subscription(self):
        init_url = reverse("initialize-subscription-payment")
        init_response = self.client.post(init_url, {"plan_code": self.plan.code}, format="json")
        self.assertEqual(init_response.status_code, 200)
        subscription = Subscription.objects.get(user=self.user)
        tx_ref = subscription.transactions.first().tx_ref

        callback_url = reverse("chapa-payment-callback")
        payload = {
            "status": "success",
            "data": {
                "tx_ref": tx_ref,
            },
            "tx_ref": tx_ref,
        }

        with self.settings(CHAPA_SECRET_KEY="dummy_key"):
            response = self.client.post(callback_url, payload, format="json")
        self.assertEqual(response.status_code, 200)

        subscription.refresh_from_db()
        self.user.refresh_from_db()
        self.assertEqual(subscription.status, "active")
        self.assertTrue(subscription.is_active)
        self.assertEqual(self.user.tier, self.plan.tier)

    def test_reminder_task_downgrades_overdue(self):
        subscription = Subscription.objects.create(
            user=self.user,
            plan=self.plan,
            plan_code=self.plan.code,
            tier=self.plan.tier,
            amount=self.plan.amount,
            currency=self.plan.currency,
            start_date=timezone.now() - timedelta(days=60),
            end_date=timezone.now() - timedelta(days=30),
            next_billing_date=timezone.now() - timedelta(days=1),
            status="active",
            is_active=True,
            payment_status="completed",
        )

        from api.tasks import send_subscription_reminders

        send_subscription_reminders()

        subscription.refresh_from_db()
        self.user.refresh_from_db()
        self.assertFalse(subscription.is_active)
        self.assertEqual(subscription.status, "expired")
        self.assertEqual(self.user.tier, "free")

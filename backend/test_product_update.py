import requests
import json

# Use the admin token
admin_token = 'a95e6ea0162901c57edc940a9a86e22c947b37df'

# Get a product first
products_response = requests.get(
    'http://localhost:8000/api/products/',
    headers={'Authorization': f'Token {admin_token}'}
)

if products_response.status_code == 200:
    products = products_response.json()
    product_list = products if isinstance(products, list) else products.get('results', [])
    
    if product_list:
        product = product_list[0]
        product_id = product['id']
        print(f"Testing with product: {product['name']} (ID: {product_id})")
        print(f"Current category: {product.get('category')}")
        print(f"Current subcategory: {product.get('subcategory')}")
        
        # Get categories
        cats_response = requests.get('http://localhost:8000/api/categories/')
        cats = cats_response.json()
        cat_list = cats if isinstance(cats, list) else cats.get('results', [])
        
        # Find Building Materials and one of its subcategories
        building_materials = next((c for c in cat_list if c['name'] == 'Building Materials'), None)
        if building_materials:
            print(f"\nBuilding Materials ID: {building_materials['id']}")
            
            # Find a subcategory
            cement = next((c for c in cat_list if c['name'] == 'Cement & Concrete'), None)
            if cement:
                print(f"Cement & Concrete ID: {cement['id']}")
                
                # Try to update the product
                update_payload = {
                    'category': building_materials['id'],
                    'subcategory': cement['id']
                }
                
                print(f"\nAttempting update with payload: {json.dumps(update_payload, indent=2)}")
                
                update_response = requests.patch(
                    f'http://localhost:8000/api/products/{product_id}/',
                    headers={
                        'Authorization': f'Token {admin_token}',
                        'Content-Type': 'application/json'
                    },
                    json=update_payload
                )
                
                print(f"\nUpdate response status: {update_response.status_code}")
                print(f"Update response: {update_response.text}")

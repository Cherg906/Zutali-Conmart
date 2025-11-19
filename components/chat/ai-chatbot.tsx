"use client"

import { useState, useRef, useEffect } from "react"
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  Minimize2,
  Maximize2,
  RefreshCw,
  HelpCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useLanguage } from "@/lib/language-context"

interface ChatMessage {
  id: string
  message: string
  isFromAI: boolean
  timestamp: Date
  suggestions?: string[]
}

interface AIChatbotProps {
  initialMessage?: string
  onClose?: () => void
}

export function AIChatbot({ 
  initialMessage = "What can I help you with today?",
  onClose 
}: AIChatbotProps) {
  const { t, language } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add initial AI message
      const welcomeMessage = language === 'am' 
        ? "ሰላም! እኔ የዙታሊ ኮንማርት AI ረዳት ነኝ። ዛሬ እንዴት ሊረዳዎት እችላለሁ?"
        : initialMessage

      setMessages([{
        id: '1',
        message: welcomeMessage,
        isFromAI: true,
        timestamp: new Date(),
        suggestions: [
          language === 'am' ? "ምርቶችን እንዴት መፈለግ እችላለሁ?" : "How do I search for products?",
          language === 'am' ? "ግምት እንዴት መጠየቅ እችላለሁ?" : "How do I request a quotation?",
          language === 'am' ? "አቅራቢዎች እንዴት ተረጋግጠዋል?" : "How are suppliers verified?",
          language === 'am' ? "የመለያ ደረጃዎች ምንድን ናቸው?" : "What are the account tiers?"
        ]
      }])
    }
  }, [isOpen, language, initialMessage])

  const handleOpen = () => {
    setIsOpen(true)
    setIsMinimized(false)
  }

  const handleClose = () => {
    setIsOpen(false)
    onClose?.()
  }

  const handleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const getAIResponse = async (userMessage: string): Promise<string> => {
    // Simulate AI response - in production, this would call your AI API
    setIsLoading(true)
    
    // Simple keyword-based responses for demo
    const lowerMessage = userMessage.toLowerCase()
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (language === 'am') {
      if (lowerMessage.includes('search') || lowerMessage.includes('ፈልግ') || lowerMessage.includes('ምርት')) {
        return "ምርቶችን ለመፈለግ የላይኛውን ክፍል ላይ ባለው የፍለጋ ሳጥን ውስጥ ይጻፉ። እንዲሁም የጎን መመዘኛዎችን በመጠቀም በዋጋ፣ በምድብ፣ በአካባቢ እና በሌሎች ሁኔታዎች መመርመር ይችላሉ።"
      } else if (lowerMessage.includes('quotation') || lowerMessage.includes('quote') || lowerMessage.includes('ግምት')) {
        return "ግምት ለመጠየቅ፣ የምርት ዝርዝር ገጽ ይጎብኙ እና 'ግምት ይጠይቁ' ቁልፍን ይንኩ። ተረጋግጠው ተጠቃሚዎች በወር ውስጥ እስከ 10 ግምቶች፣ ፕሪሚየም ተጠቃሚዎች ግን ያልተወሰነ ግምት መጠየቅ ይችላሉ።"
      } else if (lowerMessage.includes('verify') || lowerMessage.includes('verified') || lowerMessage.includes('ማረጋገጫ')) {
        return "አቅራቢዎች የንግድ ፈቃድ፣ የንግድ ምዝገባ፣ የVAT ምዝገባ እና TIN ሰርትፊኬት በማቅረብ ይረጋገጣሉ። የእኛ አስተዳደር ቡድን እያንዳንዱን ሰነድ ይገመግማል።"
      } else if (lowerMessage.includes('subscription') || lowerMessage.includes('tier') || lowerMessage.includes('ምዝገባ') || lowerMessage.includes('ደረጃ')) {
        return "ሶስት የተጠቃሚ ደረጃዎች አሉን: ነፃ (ግምት መጠየቅ አይችሉም)፣ መደበኛ (በወር 50 ብር - 10 ግምቶች)፣ እና ፕሪሚየም (በወር 200 ብር - ያልተወሰነ ግምት)።"
      } else {
        return "ይቅርታ፣ እዚህ ጥያቄ ላይ እርዳታ ለማግኘት የእኛን የደንበኞች አገልግሎት ቡድን ያግኙ። እንዲሁም የተዘጋጁ ጥያቄዎችን ከላይ መምረጥ ይችላሉ።"
      }
    } else {
      if (lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('product')) {
        return "To search for products, use the search bar at the top of the page. You can also use the sidebar filters to narrow down results by price, category, location, and other criteria."
      } else if (lowerMessage.includes('quotation') || lowerMessage.includes('quote')) {
        return "To request a quotation, visit a product detail page and click the 'Request Quote' button. Standard verified users get up to 10 quotations per month, while Premium users get unlimited quotations."
      } else if (lowerMessage.includes('verify') || lowerMessage.includes('verified') || lowerMessage.includes('supplier')) {
        return "Suppliers are verified by submitting trade license, trade registration, VAT registration, and TIN certificate. Our admin team reviews each document for authenticity."
      } else if (lowerMessage.includes('subscription') || lowerMessage.includes('tier') || lowerMessage.includes('upgrade')) {
        return "We have three user tiers: Free (no quotation requests), Standard Verified (50 ETB/month - 10 quotations), and Premium Verified (200 ETB/month - unlimited quotations)."
      } else if (lowerMessage.includes('delivery') || lowerMessage.includes('shipping')) {
        return "Delivery availability depends on the individual supplier. Look for the 'Delivery' badge on product cards to see which suppliers offer delivery services."
      } else if (lowerMessage.includes('payment') || lowerMessage.includes('pay')) {
        return "We use Flutterwave for secure payment processing. Payments are processed when you subscribe to Standard or Premium tiers, or when upgrading your product owner subscription."
      } else {
        return "I'm here to help! You can ask me about searching products, requesting quotations, supplier verification, account tiers, or any other questions about Zutali Conmart. Try selecting one of the suggested questions above."
      }
    }
  }

  const sendMessage = async (messageText?: string) => {
    const message = messageText || inputValue.trim()
    if (!message) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message,
      isFromAI: false,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue("")

    try {
      const aiResponse = await getAIResponse(message)
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: aiResponse,
        isFromAI: true,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('AI response error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([{
      id: '1',
      message: language === 'am' 
        ? "ሰላም! እንደገና እንዴት ሊረዳዎት እችላለሁ?"
        : "Hello! How can I help you again?",
      isFromAI: true,
      timestamp: new Date()
    }])
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleOpen}
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse hover:animate-none"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            <HelpCircle className="h-3 w-3 mr-1" />
            AI
          </Badge>
        </div>
      </div>
    )
  }

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
      isMinimized ? 'w-80 h-16' : 'w-80 h-96'
    }`}>
      <Card className="w-full h-full shadow-2xl border-2">
        <CardHeader className="p-3 bg-primary text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 bg-primary-foreground">
                <AvatarFallback className="bg-primary-foreground text-primary">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-sm">
                  {language === 'am' ? 'AI ረዳት' : 'AI Assistant'}
                </CardTitle>
                <p className="text-xs opacity-90">
                  {language === 'am' ? 'ዙታሊ ኮንማርት' : 'Zutali Conmart'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMinimize}
                className="h-6 w-6 p-0 text-primary-foreground hover:bg-primary-foreground/10"
              >
                {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="h-6 w-6 p-0 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0 text-primary-foreground hover:bg-primary-foreground/10"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-full">
            <ScrollArea className="flex-1 p-3 max-h-64">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${
                      message.isFromAI ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    {message.isFromAI && (
                      <Avatar className="h-6 w-6 bg-muted">
                        <AvatarFallback className="bg-muted">
                          <Bot className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[85%] p-2 rounded-lg text-sm ${
                        message.isFromAI
                          ? 'bg-muted text-foreground'
                          : 'bg-primary text-primary-foreground ml-auto'
                      }`}
                    >
                      <p>{message.message}</p>
                      {message.suggestions && (
                        <div className="mt-2 space-y-1">
                          {message.suggestions.map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="w-full justify-start text-xs h-auto py-1 px-2"
                              onClick={() => sendMessage(suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                    {!message.isFromAI && (
                      <Avatar className="h-6 w-6 bg-primary">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <Avatar className="h-6 w-6 bg-muted">
                      <AvatarFallback className="bg-muted">
                        <Bot className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-muted text-foreground p-2 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    language === 'am' ? 'መልእክት ይጻፉ...' : 'Type your message...'
                  }
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
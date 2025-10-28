// Medical Chatbot JavaScript
class MedicalChatbot {
    constructor() {
        this.apiUrl = 'http://localhost:8000';
        this.chatContainer = document.getElementById('chatContainer');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.isLoading = false;
        
        this.initializeEventListeners();
        this.checkApiStatus();
    }
    
    initializeEventListeners() {
        // Chat interface controls
        document.getElementById('startChatBtn').addEventListener('click', () => this.openChat());
        document.getElementById('closeChatBtn').addEventListener('click', () => this.closeChat());
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        
        // Enter key support
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Feature buttons
        document.querySelectorAll('.feature-btn').forEach(btn => {
            btn.addEventListener('click', () => this.openChat());
        });
        
        document.querySelectorAll('.service-btn, .specialty-btn').forEach(btn => {
            btn.addEventListener('click', () => this.openChat());
        });
        
        // Menu and share buttons
        document.getElementById('menuBtn').addEventListener('click', () => this.toggleMenu());
        document.getElementById('shareBtn').addEventListener('click', () => this.shareApp());
    }
    
    async checkApiStatus() {
        try {
            const response = await fetch(`${this.apiUrl}/health`);
            const data = await response.json();
            console.log('API Status:', data);
            
            // Update UI with API status
            this.updateApiStatus(data);
        } catch (error) {
            console.error('API connection failed:', error);
            this.showApiError();
        }
    }
    
    updateApiStatus(data) {
        // Update footer stats if API is healthy
        if (data.status === 'healthy') {
            const statNumbers = document.querySelectorAll('.stat-number');
            if (statNumbers.length >= 3) {
                statNumbers[0].textContent = `${data.vector_count.toLocaleString()}+`;
                statNumbers[1].textContent = data.medical_domains.split(' ')[0];
                statNumbers[2].textContent = '24/7';
            }
        }
    }
    
    showApiError() {
        // Show error message in chat if API is not available
        const errorMessage = {
            type: 'bot',
            content: '⚠️ Medical AI service is currently unavailable. Please try again later or contact support.',
            time: new Date().toLocaleTimeString()
        };
        this.addMessage(errorMessage);
    }
    
    openChat() {
        this.chatContainer.classList.add('active');
        this.chatInput.focus();
        
        // Add welcome message if chat is empty
        if (this.chatMessages.children.length <= 1) {
            const welcomeMessage = {
                type: 'bot',
                content: 'Welcome! I can help you with medical information based on comprehensive medical literature. What would you like to know?',
                time: new Date().toLocaleTimeString()
            };
            this.addMessage(welcomeMessage);
        }
    }
    
    closeChat() {
        this.chatContainer.classList.remove('active');
    }
    
    async sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || this.isLoading) return;
        
        // Add user message
        const userMessage = {
            type: 'user',
            content: message,
            time: new Date().toLocaleTimeString()
        };
        this.addMessage(userMessage);
        
        // Clear input and disable send button
        this.chatInput.value = '';
        this.setLoading(true);
        
        try {
            // Send to API
            const response = await fetch(`${this.apiUrl}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question: message })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Add bot response
            const botMessage = {
                type: 'bot',
                content: this.formatBotResponse(data),
                time: new Date().toLocaleTimeString(),
                sources: data.sources,
                confidence: data.confidence
            };
            this.addMessage(botMessage);
            
        } catch (error) {
            console.error('Error sending message:', error);
            
            const errorMessage = {
                type: 'bot',
                content: 'Sorry, I encountered an error processing your request. Please try again or check if the medical AI service is running.',
                time: new Date().toLocaleTimeString()
            };
            this.addMessage(errorMessage);
        } finally {
            this.setLoading(false);
        }
    }
    
    formatBotResponse(data) {
        let response = data.answer;
        
        // Add confidence indicator
        if (data.confidence) {
            response += `\n\n**Confidence Level:** ${data.confidence}`;
        }
        
        // Add sources if available
        if (data.sources && data.sources.length > 0) {
            response += `\n\n**Sources Found:** ${data.sources.length} relevant medical documents`;
        }
        
        return response;
    }
    
    addMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.type}-message`;
        
        const avatar = message.type === 'bot' ? 'fas fa-robot' : 'fas fa-user';
        
        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="${avatar}"></i>
            </div>
            <div class="message-content">
                <p>${this.formatMessageContent(message.content)}</p>
                <div class="message-time">${message.time}</div>
            </div>
        `;
        
        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
        
        // Add sources if available
        if (message.sources && message.sources.length > 0) {
            this.addSources(message.sources);
        }
    }
    
    formatMessageContent(content) {
        // Convert markdown-like formatting to HTML
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^(.*)$/, '<p>$1</p>');
    }
    
    addSources(sources) {
        const sourcesElement = document.createElement('div');
        sourcesElement.className = 'sources-container';
        sourcesElement.innerHTML = `
            <div class="sources-header">
                <i class="fas fa-book-medical"></i>
                <span>Medical Sources</span>
            </div>
            <div class="sources-list">
                ${sources.map((source, index) => `
                    <div class="source-item">
                        <div class="source-number">${source.citation_number}</div>
                        <div class="source-content">
                            <div class="source-file">${source.source_file} (Page ${source.page})</div>
                            <div class="source-text">${source.content}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        this.chatMessages.appendChild(sourcesElement);
        this.scrollToBottom();
    }
    
    setLoading(loading) {
        this.isLoading = loading;
        this.sendBtn.disabled = loading;
        
        if (loading) {
            this.sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        } else {
            this.sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
    }
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    toggleMenu() {
        // Simple menu toggle functionality
        console.log('Menu toggled');
        // You can implement a mobile menu here
    }
    
    shareApp() {
        if (navigator.share) {
            navigator.share({
                title: 'MedCare - Medical AI Assistant',
                text: 'Get instant medical information from our AI-powered assistant',
                url: window.location.href
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href).then(() => {
                this.showNotification('Link copied to clipboard!');
            });
        }
    }
    
    showNotification(message) {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4A90E2;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Sample questions for quick access
const sampleQuestions = [
    "What are the symptoms of heart attack?",
    "How to treat high blood pressure?",
    "What causes diabetes?",
    "Symptoms of COVID-19",
    "How to prevent stroke?",
    "Treatment for anxiety disorders"
];

// Initialize the chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const chatbot = new MedicalChatbot();
    
    // Add sample questions to the UI
    const addSampleQuestions = () => {
        const sampleContainer = document.createElement('div');
        sampleContainer.className = 'sample-questions';
        sampleContainer.innerHTML = `
            <div class="sample-header">
                <i class="fas fa-lightbulb"></i>
                <span>Try asking:</span>
            </div>
            <div class="sample-list">
                ${sampleQuestions.map(question => `
                    <button class="sample-question" onclick="document.getElementById('chatInput').value='${question}'; document.getElementById('sendBtn').click();">
                        ${question}
                    </button>
                `).join('')}
            </div>
        `;
        
        // Add to chat messages if chat is open
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages && chatbot.chatContainer.classList.contains('active')) {
            chatMessages.appendChild(sampleContainer);
        }
    };
    
    // Add sample questions when chat opens
    document.getElementById('startChatBtn').addEventListener('click', addSampleQuestions);
    
    // Add CSS for sample questions
    const style = document.createElement('style');
    style.textContent = `
        .sample-questions {
            margin: 1rem 0;
            padding: 1rem;
            background: linear-gradient(135deg, #f8fbff 0%, #e6f3ff 100%);
            border-radius: 15px;
            border: 1px solid rgba(74, 144, 226, 0.1);
        }
        
        .sample-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
            font-weight: 600;
            color: #4A90E2;
        }
        
        .sample-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 0.5rem;
        }
        
        .sample-question {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 10px;
            padding: 0.75rem;
            text-align: left;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 0.9rem;
            color: #666;
        }
        
        .sample-question:hover {
            background: #4A90E2;
            color: white;
            border-color: #4A90E2;
            transform: translateY(-2px);
        }
        
        .sources-container {
            margin-top: 1rem;
            padding: 1rem;
            background: linear-gradient(135deg, #f8fbff 0%, #e6f3ff 100%);
            border-radius: 15px;
            border: 1px solid rgba(74, 144, 226, 0.1);
        }
        
        .sources-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
            font-weight: 600;
            color: #4A90E2;
        }
        
        .sources-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        
        .source-item {
            display: flex;
            gap: 0.75rem;
            padding: 0.75rem;
            background: white;
            border-radius: 10px;
            border: 1px solid #e9ecef;
        }
        
        .source-number {
            width: 25px;
            height: 25px;
            background: #4A90E2;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            font-weight: 600;
            flex-shrink: 0;
        }
        
        .source-content {
            flex: 1;
        }
        
        .source-file {
            font-weight: 600;
            color: #4A90E2;
            font-size: 0.9rem;
            margin-bottom: 0.25rem;
        }
        
        .source-text {
            color: #666;
            font-size: 0.85rem;
            line-height: 1.4;
        }
    `;
    document.head.appendChild(style);
});

// Add smooth scrolling for better UX
document.addEventListener('DOMContentLoaded', () => {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Add loading animation for buttons
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function() {
            if (!this.classList.contains('loading')) {
                this.classList.add('loading');
                setTimeout(() => {
                    this.classList.remove('loading');
                }, 1000);
            }
        });
    });
});

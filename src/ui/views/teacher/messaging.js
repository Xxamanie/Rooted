/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { el, renderChildren } from "../../dom-utils.js";
import { getState } from "../../../state.js";
import { api } from "../../../api.js";

export const renderMessagingView = () => {
    const { currentUser, messages, students, parents, staff } = getState();
    const conversationListContainer = el('div');
    const chatPanel = el('div', { className: 'chat-panel' });
    let activeConversationId = null;

    const allUsers = [...staff, ...students, ...parents];

    const renderChatPanel = (otherUserId) => {
        activeConversationId = otherUserId;
        const otherUser = allUsers.find(u => u.id === otherUserId);
        if (!otherUser) {
            renderChildren(chatPanel, [el('p', {style: {textAlign: 'center', padding: '20px'}}, ['Select a conversation to start messaging.'])]);
            return;
        }

        const conversationMessages = messages
            .filter(m => (m.senderId === currentUser.id && m.receiverId === otherUserId) || (m.senderId === otherUserId && m.receiverId === currentUser.id))
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const messageElements = conversationMessages.map(msg => {
            const isUser = msg.senderId === currentUser.id;
            const sender = isUser ? currentUser : otherUser;
            return el('div', {className: `chat-message ${isUser ? 'user' : 'model'}`}, [
                el('div', {className: 'user-avatar'}, [sender.name.charAt(0)]),
                el('div', {className: 'message-bubble'}, [msg.content])
            ]);
        });
        
        const messagesContainer = el('div', {className: 'chat-messages'}, messageElements);
        
        const handleSendMessage = async (e) => {
            e.preventDefault();
            const input = e.target.querySelector('textarea');
            if (input.value.trim()) {
                await api.addMessage({
                    senderId: currentUser.id,
                    receiverId: otherUserId,
                    content: input.value.trim()
                });
                input.value = '';
                // Re-render the chat and conversation list
                renderChatPanel(otherUserId);
                renderConversationList();
            }
        };

        const chatForm = el('form', {className: 'chat-form'}, [
            el('textarea', {placeholder: `Message ${otherUser.name}...`}),
            el('button', {type: 'submit', className: 'btn'}, ['➤'])
        ]);
        chatForm.addEventListener('submit', handleSendMessage);

        renderChildren(chatPanel, [
            el('div', {className: 'chat-header'}, [otherUser.name]),
            messagesContainer,
            chatForm
        ]);
        
        // Scroll to bottom
        setTimeout(() => messagesContainer.scrollTop = messagesContainer.scrollHeight, 0);
    };

    const renderConversationList = () => {
        const conversations = {};
        messages.forEach(msg => {
            if (msg.senderId === currentUser.id || msg.receiverId === currentUser.id) {
                const otherUserId = msg.senderId === currentUser.id ? msg.receiverId : msg.senderId;
                if (!conversations[otherUserId]) {
                    const otherUser = allUsers.find(u => u.id === otherUserId);
                    if (otherUser) {
                        conversations[otherUserId] = {
                            user: otherUser,
                            lastMessage: msg,
                            unread: false
                        };
                    }
                }
                if (new Date(msg.timestamp) > new Date(conversations[otherUserId].lastMessage.timestamp)) {
                    conversations[otherUserId].lastMessage = msg;
                }
                if (!msg.read && msg.receiverId === currentUser.id) {
                    conversations[otherUserId].unread = true;
                }
            }
        });

        const sortedConversations = Object.values(conversations)
            .sort((a, b) => new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp));

        const conversationElements = sortedConversations.map(conv => {
            const item = el('div', {className: `conversation-item ${conv.user.id === activeConversationId ? 'active' : ''}`}, [
                el('div', {className: 'user-avatar'}, [conv.user.name.charAt(0)]),
                el('div', {className: 'conversation-details'}, [
                    el('strong', {}, [conv.user.name]),
                    el('p', {className: 'last-message'}, [conv.lastMessage.content])
                ]),
                conv.unread ? el('div', {className: 'unread-indicator'}) : null
            ]);
            item.addEventListener('click', () => renderChatPanel(conv.user.id));
            return item;
        });
        
        renderChildren(conversationListContainer, [
            el('h4', {}, ['Conversations']),
            ...conversationElements
        ]);
    };

    renderConversationList();
    renderChatPanel(activeConversationId);

    return el('div', { className: 'messaging-view' }, [
        conversationListContainer,
        chatPanel
    ]);
};

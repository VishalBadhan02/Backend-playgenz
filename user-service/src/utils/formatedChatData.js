const formatedChatData = (chat, userId) => {
    return data = chat?.map((msg) => ({
        id: msg._id,
        sender: msg.from,
        text: msg.message,
        timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        }),
        isOwn: msg?.from === userId ? true : false,
        status: msg.status === 1 ? 'read' : msg.status === 0 ? 'sent' : 'delivered',
    }))
}

module.exports = { formatedChatData }
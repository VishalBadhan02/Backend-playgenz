const success = (msg, data = "") => {
    return (
        {
            status: true,
            message: msg,
            data: data
        }
    )
}

const failure = (msg) => {
    return (
        {
            status: false,
            message: msg

        }
    )
}

module.exports = { success, failure }
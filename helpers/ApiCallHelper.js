const getApiCall = async (url, token) => {
    const requestOptions = {
        method: 'GET',
        headers: { "Authorization": token, 'Content-Type':'application/json' },
        redirect: 'follow'
    }
    return fetch(url, requestOptions).then(response => {
        console.log("response ==================================")
        console.log(response)
        response.json()
    })
}

module.exports = {
    getApiCall
}

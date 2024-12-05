const filterCommitsOnDate = (allCommits, startDate, endDate) => {
    let filteredCommits = [];
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    allCommits.forEach(commit => {
        if (new Date(commit.date) >= startDate && new Date(commit.date) <= endDate) {
            let commitObject = {
                 "type": commit.type,
                 "hash": commit.hash,
                 "date": commit.date,
                 "author": commit.author,

            }
            commit["changeCounts"] = {};
            filteredCommits.push(commitObject);
        }
    });

    return filteredCommits;
}

const filterCommitsOnDateAndAuthor = (allCommits, startDate, endDate, developer) => {
    let filteredCommits = [];
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    allCommits.forEach(commit => {
        if (commit.author.raw.includes(developer) && new Date(commit.date) >= startDate && new Date(commit.date) <= endDate) {
            let commitObject = {
                 "type": commit.type,
                 "hash": commit.hash,
                 "date": commit.date,
                 "author": commit.author,

            }
            commit["changeCounts"] = {};
            filteredCommits.push(commitObject);
        }
    });

    return filteredCommits;
}

const filterResponseOnDate = (responseData, dateKey, startDate, endDate) => {
    let filteredResponse = [];
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    responseData.forEach(reponseObj => {
        if (new Date(reponseObj[dateKey]) >= startDate && new Date(reponseObj[dateKey]) <= endDate) {
            let objectToPush = {
                "comment_count": reponseObj.comment_count,
                "type": reponseObj.type,
                "id": reponseObj.id,
                "title": reponseObj.title,
                "state": reponseObj.state,
                "author": reponseObj.author,
                "created_on": reponseObj.created_on,
                "updated_on": reponseObj.updated_on,
                "links": reponseObj.links
            }
            filteredResponse.push(objectToPush);
        }
    });

    return filteredResponse;
}

const filterResponseOnDateAndDev = (responseData, dateKey, startDate, endDate, developer) => {
    let filteredResponse = [];
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    responseData.forEach(reponseObj => {
        console.log("reponseObj.author ==================")
        console.log(reponseObj.author)
        if (reponseObj.author.display_name.includes(developer) &&  new Date(reponseObj[dateKey]) >= startDate && new Date(reponseObj[dateKey]) <= endDate) {
            let objectToPush = {
                "comment_count": reponseObj.comment_count,
                "type": reponseObj.type,
                "id": reponseObj.id,
                "title": reponseObj.title,
                "state": reponseObj.state,
                "author": reponseObj.author,
                "created_on": reponseObj.created_on,
                "updated_on": reponseObj.updated_on,
                "links": reponseObj.links
            }
            filteredResponse.push(objectToPush);
        }
    });

    return filteredResponse;
}

const filterResponseOnDateAndDevForDeclined = (responseData, dateKey, startDate, endDate, developer) => {
    let filteredResponse = [];
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    responseData.forEach(reponseObj => {
        console.log("reponseObj.author ==================")
        console.log(reponseObj.author)
        if (reponseObj.author.raw.includes(developer) &&  new Date(reponseObj[dateKey]) >= startDate && new Date(reponseObj[dateKey]) <= endDate) {
            let objectToPush = {
                "comment_count": reponseObj.comment_count,
                "type": reponseObj.type,
                "id": reponseObj.id,
                "title": reponseObj.title,
                "state": reponseObj.state,
                "author": reponseObj.author,
                "created_on": reponseObj.created_on,
                "updated_on": reponseObj.updated_on,
                "links": reponseObj.links
            }
            filteredResponse.push(objectToPush);
        }
    });

    return filteredResponse;
}

//For AZD we need Date in format "MM/DD/YYYY HH:mm:ss AM/PM" so doing it manually.
const getStartEndDateForAZD = (startDate, endDate) => {
    let startDateSplit = startDate.split("-");
    let endDateSplit = endDate.split("-");
    let azdFormatStartDate = startDateSplit[1] + "/" + startDateSplit[2] + "/" + startDateSplit[0] + " 12:00:01 AM";
    let azdFormatEndDate = endDateSplit[1] + "/" + endDateSplit[2] + "/" + endDateSplit[0] + " 11:59:59 PM";

    return {
        startDate: azdFormatStartDate,
        endDate: azdFormatEndDate
    }
}

module.exports = {
    filterCommitsOnDate,
    filterResponseOnDate,
    filterCommitsOnDateAndAuthor,
    filterResponseOnDateAndDev,
    filterResponseOnDateAndDevForDeclined,
    getStartEndDateForAZD
}

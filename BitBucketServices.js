const dataFormatter = require("./helpers/DataFormatter");
const ApiCallHelper = require('./helpers/ApiCallHelper');
const DateHelper = require("./helpers/DateHelper");

const getAllRepos = async (url, username, passkey, projectKey) => {
    const token = dataFormatter.passwordEncrypt(username, passkey);
    try {
        const workSpacesRes = await ApiCallHelper.getApiCall(url + "/rest/api/latest/projects/" + projectKey + "/repos", `Basic ${token}`);
        
        let allPromises = [];
        console.log("workSpacesRes.data")
        console.log(workSpacesRes.values)
        let allWorkSpaces = workSpacesRes.values;
        allWorkSpaces.forEach(workSpace => {
            allPromises.push(ApiCallHelper.getApiCall(url + "/repositories/" + workSpace.slug, `Basic ${token}`));
        });
        return Promise.all(allPromises).then((responses) => {
            return dataFormatter.formatBitBucketAllRepoData(responses);
        })

    } catch (error) {
        console.log("error ===================")
        console.log(error)
        return "error"
    }
}

const getGitMetrics = async (res, requestBody) => {
    const token = "Basic " + dataFormatter.passwordEncrypt(requestBody.username, requestBody.passkey);
    let gitMetricData = {
        allCommitsData: [],
        allMergedPrs: [],
        allDeclinedPrs: [],
        allOpenPrs: [],
        numberOfApiCalls: 0
    }
    let linkForCommit = requestBody.repository.commitsLink + "?branches=all&pagelen=100";
   
    getAllCommits(res, token, requestBody, linkForCommit, gitMetricData);
}

const getAllCommits = async (res, token, requestBody, commitLink, gitMetricData) => {
    console.log("commitLink")
    console.log(commitLink)
    const commitResponse = await ApiCallHelper.getApiCall(commitLink, token);
    gitMetricData.numberOfApiCalls++
    gitMetricData.allCommitsData.push(...commitResponse.data.values)
    if (commitResponse.data.next && gitMetricData.allCommitsData.length < 1000) {
        getAllCommits(res, token, requestBody, commitResponse.data.next, gitMetricData);
    } else {
        let commitsWithinDates = DateHelper.filterCommitsOnDate(gitMetricData.allCommitsData, requestBody.startDate, requestBody.endDate);
        gitMetricData.allCommitsData = commitsWithinDates;
        let prLink = requestBody.repository.prLinks + "?state=MERGED&pagelen=50";
        getAllMergedPullRequests(res, token, requestBody, gitMetricData, prLink);
    }
}

const getAllMergedPullRequests = async (res, token, requestBody, gitMetricData, prLink) => {
    console.log("prLink")
    console.log(prLink)
    const allMergedPrResponse = await ApiCallHelper.getApiCall(prLink, token);
    gitMetricData.numberOfApiCalls++;
    gitMetricData.allMergedPrs.push(...allMergedPrResponse.data.values);
    if (allMergedPrResponse.data.next/*  && gitMetricData.allMergedPrs.length < 100 */) {
        getAllMergedPullRequests(res, token, requestBody, gitMetricData, allMergedPrResponse.data.next);
    } else {
        let allMergedPrsInDate = DateHelper.filterResponseOnDate(gitMetricData.allMergedPrs, "updated_on", requestBody.startDate, requestBody.endDate);
        gitMetricData.allMergedPrs = allMergedPrsInDate;
        prLink = requestBody.repository.commitsLink + "?state=DECLINED&pagelen=50";
        getAllDeclinedPullRequests(res, token, requestBody, gitMetricData, prLink);
    }
}

const getAllDeclinedPullRequests = async (res, token, requestBody, gitMetricData, prLink) => {
    console.log("prLink Declined")
    console.log(prLink)
    const allDeclinedPrResponse = await ApiCallHelper.getApiCall(prLink, token);
    gitMetricData.numberOfApiCalls++;
    gitMetricData.allDeclinedPrs.push(...allDeclinedPrResponse.data.values);
    if (allDeclinedPrResponse.data.next/*  && gitMetricData.allDeclinedPrs.length < 100 */) {
        getAllDeclinedPullRequests(res, token, requestBody, gitMetricData, allDeclinedPrResponse.data.next);
    } else {
        let allDeclinedPrsInDate = DateHelper.filterResponseOnDate(gitMetricData.allDeclinedPrs, "updated_on", requestBody.startDate, requestBody.endDate);
        gitMetricData.allDeclinedPrs = allDeclinedPrsInDate;
        prLink = requestBody.repository.commitsLink + "?state=OPEN&pagelen=50";
        getAllOpenPullRequests(res, token, requestBody, gitMetricData, prLink);
    }
}

const getAllOpenPullRequests = async (res, token, requestBody, gitMetricData, prLink) => {
    console.log("prLink Opened")
    console.log(prLink)
    const allOpenPrResponse = await ApiCallHelper.getApiCall(prLink, token);
    gitMetricData.numberOfApiCalls++;
    gitMetricData.allOpenPrs.push(...allOpenPrResponse.data.values);
    if (allOpenPrResponse.data.next /* && gitMetricData.allOpenPrs.length < 100 */) {
        getAllOpenPullRequests(res, token, requestBody, gitMetricData, allOpenPrResponse.data.next);
    } else {
        let allOpenPrsInDate = DateHelper.filterResponseOnDate(gitMetricData.allOpenPrs, "updated_on", requestBody.startDate, requestBody.endDate);
        gitMetricData.allOpenPrs = allOpenPrsInDate;
        let indexOfCommits = 0;
        getAllCommitsDetails(res, token, requestBody, gitMetricData, indexOfCommits);

    }
}

const getAllCommitsDetails = async (res, token, requestBody, gitMetricData, indexOfCommits) => {
    console.log(gitMetricData.allCommitsData[indexOfCommits]);
    let linkToCall = requestBody.url + "/rest/api/latest/projects/" + requestBody.projectKey + "/repos/" + requestBody.repositorySlug + "/commits/" + gitMetricData.allCommitsData[indexOfCommits].hash + "/changes"
    console.log("linkToCall")
    console.log(linkToCall)
    let commitDetailsReponse;
    try {
        commitDetailsReponse = await ApiCallHelper.getApiCall(linkToCall, token);
    } catch (error) {
        console.log("error ======================================")
        console.log(error)
    }
    
    console.log("commitDetailsReponse.data ====================================================")
    console.log(commitDetailsReponse.data)
    let differenceData = dataFormatter.calculateAddedAndRemovedChanges(commitDetailsReponse.data);
    gitMetricData.allCommitsData[indexOfCommits]["changeCounts"] = differenceData
    gitMetricData.numberOfApiCalls++;
    indexOfCommits++;
    if (indexOfCommits < gitMetricData.allCommitsData.length) {
        getAllCommitsDetails(res, token, requestBody, gitMetricData, indexOfCommits);
    } else {
        let prIndex = 0;
        let activePrTypeIndex = 0;
        let allPrType = ["allMergedPrs", "allDeclinedPrs", "allOpenPrs"];
        getPullRequestComments(res, token, requestBody, gitMetricData, prIndex, activePrTypeIndex, allPrType);
    }
}

const getPullRequestComments = async (res, token, requestBody, gitMetricData, prIndex, activePrTypeIndex, allPrType) => {
    let activePrType = allPrType[activePrTypeIndex];
    if (gitMetricData[activePrType][prIndex]) {
        let prCommentsLink = gitMetricData[activePrType][prIndex]["links"]["comments"]["href"];
        console.log("prCommentsLink ==========================")
        console.log(prCommentsLink)
        const commentDetailsResponse = await ApiCallHelper.getApiCall(prCommentsLink, token);
        gitMetricData.numberOfApiCalls++;
        gitMetricData[activePrType][prIndex]["prComments"] = commentDetailsResponse.data.values;
    }
    prIndex++;
    if (prIndex < gitMetricData[activePrType].length) {
        getPullRequestComments(res, token, requestBody, gitMetricData, prIndex, activePrTypeIndex, allPrType);
    } else {
        activePrTypeIndex++;
        if (activePrTypeIndex < allPrType.length) {
            prIndex = 0;
            getPullRequestComments(res, token, requestBody, gitMetricData, prIndex, activePrTypeIndex, allPrType);
        } else {
            let gitMetricsPerUser = dataFormatter.formatGitMetricsPerUser(gitMetricData, requestBody.platform);
            // res.status(200).json({ gitMetricsPerUser, totalApiCalls: gitMetricData.numberOfApiCalls });
            res(gitMetricsPerUser, gitMetricData.numberOfApiCalls)
        }
    }
}

const getGitMetricsByDev = async (res, requestBodyToFormat) => {
    let requestBody = dataFormatter.formatMSTeamRequest(requestBodyToFormat);
    console.log("requestBody")
    console.log(requestBody)
    let allRepos = await getAllRepos(requestBody.url, requestBody.username, requestBody.passkey);
    const token = "Basic " + dataFormatter.passwordEncrypt(requestBody.username, requestBody.passkey);
    let gitMetricData = {
        allCommitsData: [],
        allMergedPrs: [],
        allDeclinedPrs: [],
        allOpenPrs: [],
        numberOfApiCalls: 0
    }
    requestBody.repository = dataFormatter.getBitRepoFromAllRepoData(allRepos, requestBody.repositorySlug, "slug");
    //http://{baseurl}/rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits
    let start = 0;
    getAllCommitsForDev(res, token, requestBody, gitMetricData, start);
}

const getAllCommitsForDev = async (res, token, requestBody, gitMetricData, start) => {
    let linkForCommit = requestBody.url + "/rest/api/latest/projects/" + requestBody.projectKey + "/repos/" + requestBody.repositorySlug + "/commits?start=" + start + "&limit=100";
    const commitResponse = await ApiCallHelper.getApiCall(linkForCommit, token);
    console.log("commitResponse -------------------------------------------")
    
    gitMetricData.numberOfApiCalls++
    start = start + 100;
    gitMetricData.allCommitsData.push(...commitResponse.values)
    if (commitResponse.values.length > 0) {
        getAllCommitsForDev(res, token, requestBody, gitMetricData, start);
    } else {
        gitMetricData.allCommitsData = DateHelper.filterCommitsOnDateAndAuthor(gitMetricData.allCommitsData, requestBody.startDate, requestBody.endDate, requestBody.developer);
        let prStart = 0
        
        getAllMergedPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
    }
}

const getAllMergedPullRequestsForDev = async (res, token, requestBody, gitMetricData, prStart) => {
    let prLink = requestBody.url + "/rest/api/latest/projects/" + requestBody.projectKey + "/repos/" + requestBody.repositorySlug + "/pull-requests?state=MERGED&limit=100&start=" + prStart;
    const allMergedPrResponse = await ApiCallHelper.getApiCall(prLink, token);
    gitMetricData.numberOfApiCalls++;
    prStart = prStart + 100;
    gitMetricData.allMergedPrs.push(...allMergedPrResponse.values);
    if (allMergedPrResponse.values.length > 0) {
        getAllMergedPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
    } else {
        let allMergedPrsInDate = DateHelper.filterResponseOnDateAndDev(gitMetricData.allMergedPrs, "updated_on", requestBody.startDate, requestBody.endDate, requestBody.developer);
        gitMetricData.allMergedPrs = allMergedPrsInDate;
        let prStart = 0;
        getAllDeclinedPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
    }
}

const getAllDeclinedPullRequestsForDev = async (res, token, requestBody, gitMetricData, prStart) => {
    let prLink = requestBody.url + "/rest/api/latest/projects/" + requestBody.projectKey + "/repos/" + requestBody.repositorySlug + "/pull-requests?state=DECLINED&limit=100&start=" + prStart;
    console.log("prLink Declined")
    console.log(prLink)
    const allDeclinedPrResponse = await ApiCallHelper.getApiCall(prLink, token);
    gitMetricData.numberOfApiCalls++;
    gitMetricData.allDeclinedPrs.push(...allDeclinedPrResponse.values);
    prStart = prStart + 100;
    if (allDeclinedPrResponse.values.length > 0/*  && gitMetricData.allDeclinedPrs.length < 100 */) {
        getAllDeclinedPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
    } else {
        let allDeclinedPrsInDate = DateHelper.filterResponseOnDateAndDev(gitMetricData.allDeclinedPrs, "updated_on", requestBody.startDate, requestBody.endDate, requestBody.developer);
        gitMetricData.allDeclinedPrs = allDeclinedPrsInDate;
        let prStart = 0;
        getAllOpenPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
    }
}

const getAllOpenPullRequestsForDev = async (res, token, requestBody, gitMetricData, prStart) => {
    let prLink = requestBody.url + "/rest/api/latest/projects/" + requestBody.projectKey + "/repos/" + requestBody.repositorySlug + "/pull-requests?state=OPEN&limit=100&start=" + prStart;
    console.log("prLink Opened")
    console.log(prLink)
    const allOpenPrResponse = await ApiCallHelper.getApiCall(prLink, token);
    gitMetricData.numberOfApiCalls++;
    gitMetricData.allOpenPrs.push(...allOpenPrResponse.values);
    prStart = prStart + 100;
    if (allOpenPrResponse.values.length > 0 /* && gitMetricData.allOpenPrs.length < 100 */) {
        getAllOpenPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
    } else {
        let allOpenPrsInDate = DateHelper.filterResponseOnDateAndDev(gitMetricData.allOpenPrs, "updated_on", requestBody.startDate, requestBody.endDate, requestBody.developer);
        gitMetricData.allOpenPrs = allOpenPrsInDate;
        let indexOfCommits = 0;
        getAllCommitsDetails(res, token, requestBody, gitMetricData, indexOfCommits);

    }
}

const startFunction = async () => {
    let requestObject = {
        "platform": "BIT repo=xtables",
        "developer": "Jayant Gangwani",
        "username": "tdgAmitDeshmukh",
        "passkey": "ATBB8B2eTjvghCm8m69rBaB7TRu7D552B79E",
        "startEndDate": "2024-07-01 To 2024-07-30"
      }
    // let allRepos = await getAllRepos("https://api.bitbucket.org/2.0", "tdgAmitDeshmukh", "ATBB8B2eTjvghCm8m69rBaB7TRu7D552B79E");
    let allRepos = await getGitMetricsByDev(responseCheck, requestObject);
    console.log("allRepos ==================")
    console.log(allRepos)
}

const responseCheck = (gitMetrics, totalApiCalls) => {
    console.log("gitMetrics")
    console.log(gitMetrics)
}

startFunction();


// module.exports = {
//     getAllRepos,
//     getGitMetrics,
//     getGitMetricsByDev
// }

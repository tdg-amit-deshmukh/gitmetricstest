const dataFormatter = require("./helpers/DataFormatter");
const ApiCallHelper = require('./helpers/ApiCallHelper');
const DateHelper = require("./helpers/DateHelper");
 
const getAllRepos = async (url, username, passkey, projectKey) => {
    const token = dataFormatter.passwordEncrypt(username, passkey);
    try {
        //let workSpacesRes = await ApiCallHelper.getApiCall(url + "/rest/api/latest/projects/" + projectKey + "/repos", `Basic ${token}`);
        const requestOptions = {
            method: 'GET',
            headers: { "Authorization": token, 'Content-Type':'application/json' },
            redirect: 'follow'
        }
        // await fetch(url, requestOptions).then(response => response.json()).then(data => {
        //     console.log("data ==========")
        //     console.log(data)
        // })
 
        fetch(url, requestOptions)
            .then((response)=> {
                // console.log("response")
                // console.log(response)
                if(response.ok){
                    return response.json();
                }
                else{
                    throw new Error('Something went wrong!');
                }
            })
            .then((data)=> {
                // console.log("data ==============");
                // console.log(data);
            })
            .catch((error)=> {
                console.error(error);
            });
        // let allPromises = [];
        // console.log("workSpacesRes.data")
        // console.log(workSpacesRes)
        // let allWorkSpaces = workSpacesRes.values;
        // allWorkSpaces.forEach(workSpace => {
        //     allPromises.push(ApiCallHelper.getApiCall(url + "/repositories/" + workSpace.slug, `Basic ${token}`));
        // });
        // return Promise.all(allPromises).then((responses) => {
        //     return dataFormatter.formatBitBucketAllRepoData(responses);
        // })
 
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
    // console.log("gitMetricData.allCommitsData[indexOfCommits]");
    // console.log(gitMetricData.allCommitsData[indexOfCommits]);
    if (!gitMetricData.allCommitsData[indexOfCommits]) {
        let prIndex = 0;
        let activePrTypeIndex = 0;
        let allPrType = ["allMergedPrs", "allDeclinedPrs", "allOpenPrs"];
        getPullRequestComments(res, token, requestBody, gitMetricData, prIndex, activePrTypeIndex, allPrType);
    }
    const requestOptions = {
        method: 'GET',
        headers: { "Authorization": token, 'Content-Type':'application/json' },
        redirect: 'follow'
    }
 
 
 
    let linkToCall = requestBody.url + "/rest/api/latest/projects/" + requestBody.projectKey + "/repos/" + requestBody.repositorySlug + "/commits/" + gitMetricData.allCommitsData[indexOfCommits].hash + "/changes"
    console.log("linkToCall")
    console.log(linkToCall)
    let commitDetailsReponse;
    try {
        // commitDetailsReponse = await ApiCallHelper.getApiCall(linkToCall, token);
        fetch(linkToCall, requestOptions)
            .then((response)=> {
                //console.log("response")
                //console.log(response)
                if(response.ok){
                    return response.json();
                }
                else{
                    throw new Error('Something went wrong!');
                }
            })
            .then((data)=> {
                // console.log("data ==============");
                // console.log(data);
                let differenceData = dataFormatter.calculateAddedAndRemovedChanges(data.values);
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
            })
            .catch((error)=> {
                console.error(error);
            });
    } catch (error) {
        console.log("error ======================================")
        console.log(error)
    }
    
    // console.log("commitDetailsReponse.data ====================================================")
    // console.log(commitDetailsReponse.data)
    // let differenceData = dataFormatter.calculateAddedAndRemovedChanges(commitDetailsReponse.data);
    // gitMetricData.allCommitsData[indexOfCommits]["changeCounts"] = differenceData
    // gitMetricData.numberOfApiCalls++;
    // indexOfCommits++;
    // if (indexOfCommits < gitMetricData.allCommitsData.length) {
    //     getAllCommitsDetails(res, token, requestBody, gitMetricData, indexOfCommits);
    // } else {
    //     let prIndex = 0;
    //     let activePrTypeIndex = 0;
    //     let allPrType = ["allMergedPrs", "allDeclinedPrs", "allOpenPrs"];
    //     getPullRequestComments(res, token, requestBody, gitMetricData, prIndex, activePrTypeIndex, allPrType);
    // }
}
 
const getPullRequestComments = async (res, token, requestBody, gitMetricData, prIndex, activePrTypeIndex, allPrType) => {
    let activePrType = allPrType[activePrTypeIndex];
    if (gitMetricData[activePrType][prIndex]) {
        let prCommentsLink = requestBody.url + "/rest/api/latest/projects/" + requestBody.projectKey + "/repos/" + requestBody.repositorySlug + "/pull-requests/" + gitMetricData[activePrType][prIndex]["id"] + "/activities";
        console.log("prCommentsLink ==========================")
        console.log(prCommentsLink)
        const requestOptions = {
            method: 'GET',
            headers: { "Authorization": token, 'Content-Type':'application/json' },
            redirect: 'follow'
        }
        fetch(prCommentsLink, requestOptions)
            .then((response)=> {
                if(response.ok){
                    return response.json();
                }
                else{
                    throw new Error('Something went wrong!');
                }
            })
            .then((data)=> {
                let allComments = ""
                data.values.forEach(activity => {
                    if (activity.action === "COMMENTED") {
                        console.log("activity ------------")
                        console.log(activity)
                        let prComment = "ID: " + activity.id + "; Comment By user: " + activity.user.displayName + "; Comment: " + activity.comment.text;
                        allComments = allComments + " ==== " + prComment;
                    }
                })
                gitMetricData[activePrType][prIndex]["prComments"] = allComments;
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
            })
            .catch((error)=> {
                console.error(error);
            });
        // const commentDetailsResponse = await ApiCallHelper.getApiCall(prCommentsLink, token);
        // gitMetricData.numberOfApiCalls++;
        // gitMetricData[activePrType][prIndex]["prComments"] = commentDetailsResponse.data.values;
    } else {
        activePrTypeIndex++;
        if (activePrTypeIndex < allPrType.length) {
            prIndex = 0;
            getPullRequestComments(res, token, requestBody, gitMetricData, prIndex, activePrTypeIndex, allPrType);
        } else {
            let gitMetricsPerUser = dataFormatter.formatGitMetricsPerUser(gitMetricData, requestBody.platform);
            res(gitMetricsPerUser, gitMetricData.numberOfApiCalls)
        }
    }
}
 
const getGitMetricsByDev = async (res, requestBodyToFormat) => {
    let requestBody = dataFormatter.formatMSTeamRequest(requestBodyToFormat);
    console.log("requestBody")
    console.log(requestBody)
    //let allRepos = await getAllRepos(requestBody.url, requestBody.username, requestBody.passkey, requestBody.projectKey);
    //console.log("allRepos");
    //console.log(allRepos)
    const token = "Basic " + dataFormatter.passwordEncrypt(requestBody.username, requestBody.passkey);
    let gitMetricData = {
        allCommitsData: [],
        allMergedPrs: [],
        allDeclinedPrs: [],
        allOpenPrs: [],
        numberOfApiCalls: 0,
        branches: []
    }
    // requestBody.repository = dataFormatter.getBitRepoFromAllRepoData(allRepos, requestBody.repositorySlug, "slug");
    // //http://{baseurl}/rest/api/latest/projects/{projectKey}/repos/{repositorySlug}/commits
    // let start = 0;
    // getAllCommitsForDev(res, token, requestBody, gitMetricData, start);
    let prStart = 0;
    getAllMergedPullRequestsForDev(res, token, requestBody, gitMetricData, prStart)
}
 
const getAllCommitsForDev = async (res, token, requestBody, gitMetricData, start) => {
    let linkForCommit = requestBody.url + "/rest/api/latest/projects/" + requestBody.projectKey + "/repos/" + requestBody.repositorySlug + "/commits?start=" + start + "&limit=100";
    //const commitResponse = await ApiCallHelper.getApiCall(linkForCommit, token);
    const requestOptions = {
        method: 'GET',
        headers: { "Authorization": token, 'Content-Type':'application/json' },
        redirect: 'follow'
    }
    console.log("linkForCommit")
    console.log(linkForCommit)
    fetch(linkForCommit, requestOptions)
            .then((response)=> {
                //console.log("response")
                //console.log(response)
                if(response.ok){
                    return response.json();
                }
                else{
                    throw new Error('Something went wrong!');
                }
            })
            .then((data)=> {
                // console.log("data ==============");
                // console.log(data);
                start = start + 100;
                gitMetricData.allCommitsData.push(...data.values);
                console.log("data.values")
                console.log(data.values)
                let lastCommit = data.values[data.values.length - 1];
                let fetchMoreData = true;
                if (lastCommit && new Date(lastCommit["authorTimestamp"]) < new Date(requestBody.startDate)) {
                    fetchMoreData = false;
                }
 
 
                if (data.values.length > 0 && fetchMoreData) {
                    getAllCommitsForDev(res, token, requestBody, gitMetricData, start);
                } else {
                    gitMetricData.allCommitsData = DateHelper.filterCommitsOnDateAndAuthor(gitMetricData.allCommitsData, requestBody.startDate, requestBody.endDate, requestBody.developer);
                    let prStart = 0;
                    getAllMergedPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
                }
            })
            .catch((error)=> {
                console.error(error);
            });
    // console.log("commitResponse -------------------------------------------")
    // console.log(commitResponse)
    // commitResponse.then(responseOfCom => {
    //     console.log("responseOfCom")
    //     console.log(responseOfCom)
    // })
    // gitMetricData.numberOfApiCalls++
    // start = start + 100;
    // gitMetricData.allCommitsData.push(...commitResponse.values)
    // if (commitResponse.values.length > 0) {
    //     getAllCommitsForDev(res, token, requestBody, gitMetricData, start);
    // } else {
    //     gitMetricData.allCommitsData = DateHelper.filterCommitsOnDateAndAuthor(gitMetricData.allCommitsData, requestBody.startDate, requestBody.endDate, requestBody.developer);
    //     let prStart = 0
        
    //     getAllMergedPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
    // }
}
 
const getAllMergedPullRequestsForDev = async (res, token, requestBody, gitMetricData, prStart) => {
    
    const requestOptions = {
        method: 'GET',
        headers: { "Authorization": token, 'Content-Type':'application/json' },
        redirect: 'follow'
    }
    
    let prLink = requestBody.url + "/rest/api/latest/projects/" + requestBody.projectKey + "/repos/" + requestBody.repositorySlug + "/pull-requests?state=MERGED&limit=100&start=" + prStart;
    console.log("prLink====+++++=================")
    console.log(prLink)
    fetch(prLink, requestOptions)
            .then((response)=> {
                //console.log("response")
                //console.log(response)
                if(response.ok){
                    return response.json();
                }
                else{
                    throw new Error('Something went wrong!');
                }
            })
            .then((data)=> {
                // console.log("data ==============");
                // console.log(data);
                prStart = prStart + 100;
                gitMetricData.allMergedPrs.push(...data.values);
                
                if (data.values.length > 0) {
                    getAllMergedPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
                } else {
                    let allMergedPrsInDate = DateHelper.filterResponseOnDateAndDev(gitMetricData.allMergedPrs, "createdDate", requestBody.startDate, requestBody.endDate, requestBody.developer);
                    gitMetricData.allMergedPrs = allMergedPrsInDate.filteredResponse;
                    gitMetricData.branches.push(...allMergedPrsInDate.allBranches)
                    let prStart = 0;
                    getAllDeclinedPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
                }
            })
            .catch((error)=> {
                console.error(error);
            });
    
    // const allMergedPrResponse = await ApiCallHelper.getApiCall(prLink, token);
    // gitMetricData.numberOfApiCalls++;
    // prStart = prStart + 100;
    // gitMetricData.allMergedPrs.push(...allMergedPrResponse.values);
    // if (allMergedPrResponse.values.length > 0) {
    //     getAllMergedPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
    // } else {
    //     let allMergedPrsInDate = DateHelper.filterResponseOnDateAndDev(gitMetricData.allMergedPrs, "updated_on", requestBody.startDate, requestBody.endDate, requestBody.developer);
    //     gitMetricData.allMergedPrs = allMergedPrsInDate;
    //     let prStart = 0;
    //     getAllDeclinedPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
    // }
}
 
const getAllDeclinedPullRequestsForDev = async (res, token, requestBody, gitMetricData, prStart) => {
    const requestOptions = {
        method: 'GET',
        headers: { "Authorization": token, 'Content-Type':'application/json' },
        redirect: 'follow'
    }
    let prLink = requestBody.url + "/rest/api/latest/projects/" + requestBody.projectKey + "/repos/" + requestBody.repositorySlug + "/pull-requests?state=DECLINED&limit=100&start=" + prStart;
    console.log("prLink Declined")
    console.log(prLink)
    fetch(prLink, requestOptions)
            .then((response)=> {
                //console.log("response")
                //console.log(response)
                if(response.ok){
                    return response.json();
                }
                else{
                    throw new Error('Something went wrong!');
                }
            })
            .then((data)=> {
                // console.log("data ==============");
                // console.log(data);
                prStart = prStart + 100;
                gitMetricData.allDeclinedPrs.push(...data.values);
                
                if (data.values.length > 0) {
                    getAllDeclinedPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
                } else {
                    let allDeclinedPrsInDate = DateHelper.filterResponseOnDateAndDev(gitMetricData.allDeclinedPrs, "createdDate", requestBody.startDate, requestBody.endDate, requestBody.developer);
                    gitMetricData.allDeclinedPrs = allDeclinedPrsInDate.filteredResponse;
                    gitMetricData.branches.push(...allDeclinedPrsInDate.allBranches)
                    let prStart = 0;
                    getAllOpenPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
                }
            })
            .catch((error)=> {
                console.error(error);
            });
    
    // const allDeclinedPrResponse = await ApiCallHelper.getApiCall(prLink, token);
    // gitMetricData.numberOfApiCalls++;
    // gitMetricData.allDeclinedPrs.push(...allDeclinedPrResponse.values);
    // prStart = prStart + 100;
    // if (allDeclinedPrResponse.values.length > 0/*  && gitMetricData.allDeclinedPrs.length < 100 */) {
    //     getAllDeclinedPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
    // } else {
    //     let allDeclinedPrsInDate = DateHelper.filterResponseOnDateAndDev(gitMetricData.allDeclinedPrs, "updated_on", requestBody.startDate, requestBody.endDate, requestBody.developer);
    //     gitMetricData.allDeclinedPrs = allDeclinedPrsInDate;
    //     let prStart = 0;
    //     getAllOpenPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
    // }
}
 
const getAllOpenPullRequestsForDev = async (res, token, requestBody, gitMetricData, prStart) => {
    const requestOptions = {
        method: 'GET',
        headers: { "Authorization": token, 'Content-Type':'application/json' },
        redirect: 'follow'
    }
    
    let prLink = requestBody.url + "/rest/api/latest/projects/" + requestBody.projectKey + "/repos/" + requestBody.repositorySlug + "/pull-requests?state=OPEN&limit=100&start=" + prStart;
    console.log("prLink Opened")
    console.log(prLink)
    fetch(prLink, requestOptions)
            .then((response)=> {
                //console.log("response")
                //console.log(response)
                if(response.ok){
                    return response.json();
                }
                else{
                    throw new Error('Something went wrong!');
                }
            })
            .then((data)=> {
                // console.log("data ==============");
                // console.log(data);
                prStart = prStart + 100;
                gitMetricData.allOpenPrs.push(...data.values);
                
                if (data.values.length > 0) {
                    getAllOpenPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
                } else {
                    let allOpenPrsInDate = DateHelper.filterResponseOnDateAndDev(gitMetricData.allOpenPrs, "createdDate", requestBody.startDate, requestBody.endDate, requestBody.developer);
                    gitMetricData.allOpenPrs = allOpenPrsInDate.filteredResponse;
                    gitMetricData.branches.push(...allOpenPrsInDate.allBranches)
 
                    
                    getAllBranches(res, token, requestBody, gitMetricData)
                    // getAllCommitsForReposForDev(res, token, requestBody, gitMetricData, start, branchIndex);
                    // let indexOfCommits = 0;
                    // getAllCommitsDetails(res, token, requestBody, gitMetricData, indexOfCommits);
                }
            })
            .catch((error)=> {
                console.error(error);
            });
    // const allOpenPrResponse = await ApiCallHelper.getApiCall(prLink, token);
    // gitMetricData.numberOfApiCalls++;
    // gitMetricData.allOpenPrs.push(...allOpenPrResponse.values);
    // prStart = prStart + 100;
    // if (allOpenPrResponse.values.length > 0 /* && gitMetricData.allOpenPrs.length < 100 */) {
    //     getAllOpenPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
    // } else {
    //     let allOpenPrsInDate = DateHelper.filterResponseOnDateAndDev(gitMetricData.allOpenPrs, "updated_on", requestBody.startDate, requestBody.endDate, requestBody.developer);
    //     gitMetricData.allOpenPrs = allOpenPrsInDate;
    //     let indexOfCommits = 0;
    //     getAllCommitsDetails(res, token, requestBody, gitMetricData, indexOfCommits);
 
    // }
}
 
const getAllBranches = (res, token, requestBody, gitMetricData) => {
    let linkForBranches = requestBody.url + "/rest/api/latest/projects/" + requestBody.projectKey + "/repos/" + requestBody.repositorySlug + "/branches";
    const requestOptions = {
        method: 'GET',
        headers: { "Authorization": token, 'Content-Type':'application/json' },
        redirect: 'follow'
    }
    console.log("linkForBranches---------------------------------")
    console.log(linkForBranches)
    fetch(linkForBranches, requestOptions)
            .then((response)=> {
                // console.log("response")
                // console.log(response)
                if(response.ok){
                    return response.json();
                }
                else{
                    throw new Error('Something went wrong!');
                }
            })
            .then((data) => {
                console.log("data for all branches")
                // console.log(data.values)
                gitMetricData.branches = data.values;
                let branchIndex = 0;
                let start = 0;
                getAllCommitsForReposForDev(res, token, requestBody, gitMetricData, start, branchIndex);
            })
}
 
const getAllCommitsForReposForDev = async (res, token, requestBody, gitMetricData, start, branchIndex) => {
    console.log("22222222gitMetricData")
    // console.log(gitMetricData.branches)
    let linkForCommit = requestBody.url + "/rest/api/latest/projects/" + requestBody.projectKey + "/repos/" + requestBody.repositorySlug + "/commits?until=" + gitMetricData.branches[branchIndex]["id"] + "&start=" + start + "&limit=100";
    //const commitResponse = await ApiCallHelper.getApiCall(linkForCommit, token);
    const requestOptions = {
        method: 'GET',
        headers: { "Authorization": token, 'Content-Type':'application/json' },
        redirect: 'follow'
    }
    console.log("linkForCommit ))))))))))))))))))))))")
    console.log(linkForCommit)
    fetch(linkForCommit, requestOptions)
            .then((response)=> {
                // console.log("response")
                // console.log(response)
                if(response.ok){
                    return response.json();
                }
                else{
                    throw new Error('Something went wrong!');
                }
            })
//https://git.gartner.com/rest/api/latest/projects/EC/repos/digital-workspace-app/commits?until=feature/changes-for-initiative-page&start=100&limit=100
//https://git.gartner.com/rest/api/latest/projects/EC/repos/digital-workspace-app/commits?until=feature/my-activity-api&start=0&limit=100
            .then((data)=> {
                console.log("data ==============");
                console.log("data ---------------");
                start = start + 100;
                gitMetricData.allCommitsData.push(...data.values);
                console.log("data.values")
                console.log("data.values")
                let lastCommit = data.values[data.values.length - 1];
                let fetchMoreData = true;
                if (lastCommit && new Date(lastCommit["authorTimestamp"]) < new Date(requestBody.startDate)) {
                    fetchMoreData = false;
                }
 
 
                if (data.values.length > 0 && fetchMoreData) {
                    getAllCommitsForReposForDev(res, token, requestBody, gitMetricData, start, branchIndex);
                } else {
                    branchIndex++;
                    if (gitMetricData.branches[branchIndex]) {
                        start = 0;
                        getAllCommitsForReposForDev(res, token, requestBody, gitMetricData, start, branchIndex);
                    } else {
                        gitMetricData.allCommitsData = DateHelper.filterCommitsOnDateAndAuthor(gitMetricData.allCommitsData, requestBody.startDate, requestBody.endDate, requestBody.developer);
                        // let prStart = 0;
                        // getAllMergedPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
                        let indexOfCommits = 0;
                        getAllCommitsDetails(res, token, requestBody, gitMetricData, indexOfCommits);
                    }
 
 
                    
                }
            })
            .catch((error)=> {
                console.error(error);
            });
    // console.log("commitResponse -------------------------------------------")
    // console.log(commitResponse)
    // commitResponse.then(responseOfCom => {
    //     console.log("responseOfCom")
    //     console.log(responseOfCom)
    // })
    // gitMetricData.numberOfApiCalls++
    // start = start + 100;
    // gitMetricData.allCommitsData.push(...commitResponse.values)
    // if (commitResponse.values.length > 0) {
    //     getAllCommitsForDev(res, token, requestBody, gitMetricData, start);
    // } else {
    //     gitMetricData.allCommitsData = DateHelper.filterCommitsOnDateAndAuthor(gitMetricData.allCommitsData, requestBody.startDate, requestBody.endDate, requestBody.developer);
    //     let prStart = 0
        
    //     getAllMergedPullRequestsForDev(res, token, requestBody, gitMetricData, prStart);
    // }
}
 
const startFunction = async () => {
    let requestObject = {
        "platform": "BIT repo=digital-workspace-app",
        "developer": "ask",
        "username": "ask",
        "passkey": "",
        "startEndDate": "2024-11-01 To 2024-12-30"
      }
    // let requestObject = {
    //     "platform": "BIT repo=spark-data-import",
    //     "developer": "pkumbhar",
    //     "username": "pkumbhar",
    //     "passkey": "",
    //     "startEndDate": "2024-11-01 To 2024-12-30"
    //   }
    // let allRepos = await getAllRepos("https://api.bitbucket.org/2.0", "tdgAmitDeshmukh", "ATBB8B2eTjvghCm8m69rBaB7TRu7D552B79E");
    let allRepos = await getGitMetricsByDev(responseCheck, requestObject);
    // console.log("allRepos ==================")
    // console.log(allRepos)
}
 
const responseCheck = (gitMetrics, totalApiCalls) => {
    console.log("gitMetrics")
    console.log(gitMetrics)
}
 
startFunction();
 
/* URL: https://git.gartner.com/projects/EC/repos/digital-workspace-app/browse
Project Key: digital-workspace-app
Repo Key: digital-workspace-app
username: ask
 */
// module.exports = {
//     getAllRepos,
//     getGitMetrics,
//     getGitMetricsByDev
// }

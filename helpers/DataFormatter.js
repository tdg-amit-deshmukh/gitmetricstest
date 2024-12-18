const passwordEncrypt = (username, passkey) => {
    const token = btoa(`${username}:${passkey}`);
    return token;
}
 
const formatBitBucketAllRepoData = (allWorkSpacesDetails) => {
    let allRepositories = [];
    allWorkSpacesDetails.forEach(reposDataInWorkSpace => {
        let reposInWorkSpace = reposDataInWorkSpace.values;
        if (reposInWorkSpace.length > 0) {
            reposInWorkSpace.forEach(eachRepo => {
                allRepositories.push({
                    fullName: eachRepo.full_name,
                    name: eachRepo.name,
                    slug: eachRepo.slug,
                    owner: eachRepo.owner.display_name,
                    workSpace: eachRepo.workspace.slug,
                    commitsLink: eachRepo.links.commits.href,
                    prLinks: eachRepo.links.pullrequests.href,
                    projectName: eachRepo.project.name.toLowerCase()
                })
            })
        }
    });
 
    return allRepositories;
}
 
const formatGitHubAllRepoData = (allRepositoriesDetails) => {
    let allRepositories = [];
    allRepositoriesDetails.forEach(eachRepo => {
        console.log("eachRepo")
        // console.log(eachRepo)
        allRepositories.push({
            fullName: eachRepo.full_name,
            name: eachRepo.name,
            slug: eachRepo.name,
            owner: eachRepo.owner.login
        })
    })
 
    return allRepositories;
}
 
const getRepoFromAllReposData = (allWorkSpacesDetails, repoSlug, repoNameKey) => {
    let repository = {};
    allWorkSpacesDetails.forEach(eachRepo => {
        if (eachRepo[repoNameKey] === repoSlug)
            repository = {
                fullName: eachRepo.full_name,
                name: eachRepo.name,
                slug: eachRepo.name,
                owner: eachRepo.owner.login
            }
    })
 
    return repository;
}
 
const getBitRepoFromAllRepoData = (allWorkSpacesDetails, repoSlug, repoNameKey) => {
    let repository = {};
    allWorkSpacesDetails.forEach(eachRepo => {
        if (eachRepo[repoNameKey] === repoSlug) {
            console.log("eachRepo")
            // console.log(eachRepo)
            repository = eachRepo;
        }
    })
 
    return repository;
}
 
 
const formatAzureDevRepoData = (allRepositoriesResponse) => {
    let allRepositories = [];
    allRepositoriesResponse.forEach(repoResponse => {
        let allRepos = repoResponse.data.value;
        allRepos.forEach(repo => {
            allRepositories.push({
                fullName: repo.name,
                name: repo.name,
                slug: repo.id,
                owner: "",
                projectName: repo.project.name.toLowerCase()
            })
        })
    })
 
    return allRepositories;
}
 
const calculateAddedAndRemovedChanges = (commitDifferences) => {
    let addedLines = 0, removedLines = 0, totalChanges = 0;
    // console.log("commitDifferences")
    // console.log(commitDifferences)
    // const diffLines = commitDifferences.split('\n');
    commitDifferences.forEach(commit => {
        // if (line.startsWith('+') && !line.startsWith('+++')) {
        //     addedLines++;
        // }
        // if (line.startsWith('-') && !line.startsWith('---')) {
        //     removedLines++;
        // }
        if (commit.type === "ADD") {
            addedLines++;
        }
        totalChanges++;
    });
 
    return { addedLines, removedLines, totalChanges }
}
 
const formatGitMetricsPerUser = (gitMetricsData, platform) => {
    let gitMetricPerUser = {};
    gitMetricPerUser = addCommitsData(gitMetricsData.allCommitsData, platform, gitMetricPerUser);
    gitMetricPerUser = addMergedPrsData(gitMetricsData.allMergedPrs, platform, gitMetricPerUser);
    gitMetricPerUser = addDeclinedPrsData(gitMetricsData.allDeclinedPrs, platform, gitMetricPerUser);
    gitMetricPerUser = addOpenPrsData(gitMetricsData.allOpenPrs, platform, gitMetricPerUser);
 
    return gitMetricPerUser;
}
 
const addCommitsData = (commitsData, platform, gitMetricPerUser) => {
    if (commitsData.length > 0) {
 
        commitsData.forEach(commit => {
            let author = getAuthorName(commit, platform, "commit");
 
            if (gitMetricPerUser[author]) {
                gitMetricPerUser[author] = getAuthorCommitData(gitMetricPerUser[author], commit, platform);
            } else {
                gitMetricPerUser[author] = getNewUsersData(commit, "commit", platform);
            }
        })
    }
 
    return gitMetricPerUser;
}
 
const getAuthorCommitData = (authorData, commit, platform) => {
    if (platform === "BIT" || platform === "GIT") {
        authorData.totalCommits++;
        authorData.changesCount.addedLines += commit.changeCounts.addedLines;
        authorData.changesCount.removedLines += commit.changeCounts.removedLines;
        authorData.changesCount.totalChanges += commit.changeCounts.totalChanges;
    } else {
        let addedLines = commit.changeCounts.Add;
        let deletedLines = commit.changeCounts.Delete;
        let editedLines = commit.changeCounts.Edit;
        authorData.totalCommits++;
        authorData.changesCount.addedLines += addedLines;
        authorData.changesCount.removedLines += deletedLines;
        authorData.changesCount.totalChanges += (addedLines + deletedLines + editedLines);
    }
 
    return authorData;
}
 
const addMergedPrsData = (mergedPrsData, platform, gitMetricPerUser) => {
    if (mergedPrsData.length > 0) {
        mergedPrsData.forEach(mergedPr => {
            let author = getAuthorName(mergedPr, platform, "mergedPR");
            if (gitMetricPerUser[author]) {
                gitMetricPerUser[author] = getAuthorMergedPrData(gitMetricPerUser[author], mergedPr, "mergedPrs", platform);
            } else {
                gitMetricPerUser[author] = getNewUsersData(mergedPr, "mergedPr");
            }
        })
    }
 
    return gitMetricPerUser;
}
 
const addDeclinedPrsData = (declinedPrs, platform, gitMetricPerUser) => {
    if (declinedPrs.length > 0) {
        declinedPrs.forEach(declinedPr => {
            let author = getAuthorName(declinedPr, platform, "declinedPR");
            if (gitMetricPerUser[author]) {
                gitMetricPerUser[author] = getAuthorMergedPrData(gitMetricPerUser[author], declinedPr, "declinedPrs");
            } else {
                gitMetricPerUser[author] = getNewUsersData(declinedPr, "declinedPr");
            }
        })
    }
 
    return gitMetricPerUser;
}
 
const addOpenPrsData = (openPrs, platform, gitMetricPerUser) => {
    if (openPrs.length > 0) {
        openPrs.forEach(openPr => {
            let author = getAuthorName(openPr, platform, "openPR");
            if (gitMetricPerUser[author]) {
                gitMetricPerUser[author] = getAuthorMergedPrData(gitMetricPerUser[author], openPr, "openPrs");
            } else {
                gitMetricPerUser[author] = getNewUsersData(openPr, "openPr");
            }
        })
    }
 
    return gitMetricPerUser;
}
 
const getAuthorName = (dataObject, platform, objectOf) => {
    let authorName = ""
    if (platform === "BIT") {
        console.log("dataObject.author---------------------")
        console.log(dataObject.author)
        if (objectOf === "commit") {
            authorName = dataObject.author.toLowerCase();
        } else {
            authorName = dataObject.author.toLowerCase();
        }
    } else if (platform === "GIT") {
        if (objectOf === "commit") {
            authorName = dataObject.commit.author.name.toLowerCase();
        } else {
            authorName = dataObject.user.login.toLowerCase();
        }
    } else if (platform === "AZD") {
        if (objectOf === "commit") {
            authorName = dataObject.author.name.toLowerCase();
        } else {
            authorName = dataObject.createdBy.displayName.toLowerCase();
        }
    }
 
    return authorName
}
 
const getAuthorMergedPrData = (authorData, prObject, prStatus, platform) => {
    if (prStatus === "mergedPrs") {
        authorData.totalMergedPrs++;
    } else if (prStatus === "declinedPrs") {
        authorData.totalDeclinedPrs++;
    } else if (prStatus === "openPrs") {
        authorData.allOpenPrs++;
    }
 
    authorData.totalPrComments += prObject.comment_count;
    authorData.prComments = authorData.prComments + prObject.prComments;
 
    return authorData
}
 
const getNewUsersData = (dataObject, newDataFor, platform) => {
    if (newDataFor === "commit") {
        let addedLines = dataObject.changeCounts.addedLines;
        let removedLines = dataObject.changeCounts.removedLines;
        let totalChanges = dataObject.changeCounts.totalChanges;
        if (platform === "AZD") {
            addedLines = dataObject.changeCounts.Add;
            removedLines = dataObject.changeCounts.Delete;
            totalChanges = dataObject.changeCounts.Add + dataObject.changeCounts.Delete + dataObject.changeCounts.Edit
        }
        return {
            "totalCommits": 1,
            "changesCount": {
                "addedLines": addedLines,
                "removedLines": removedLines,
                "totalChanges": totalChanges,
            },
            "totalMergedPrs": 0,
            "totalDeclinedPrs": 0,
            "totalOpenPrs": 0,
            "totalPrComments": 0,
            "prComments": ""
        }
    } else {
        return {
            "totalCommits": 0,
            "changesCount": { "addedLines": 0, "removedLines": 0, "totalChanges": 0 },
            "totalMergedPrs": newDataFor === "mergedPr" ? 1 : 0,
            "totalDeclinedPrs": newDataFor === "declinedPr" ? 1 : 0,
            "totalOpenPrs": newDataFor === "openPr" ? 1 : 0,
            "totalPrComments": dataObject.comment_count,
            "prComments": dataObject.prComments
        }
    }
}
 
 
const getOpenAndClosedPRsInDateRange = (pullRequestData, startDate, endDate) => {
    let pullRequests = {
        openPrs: [],
        closedPrs: []
    }
    let startDateObject = new Date(startDate);
    let endDateObject = new Date(endDate);
    let indexForThis = 0;
    pullRequestData.forEach(pullRequest => {
        if (new Date(pullRequest.updated_at) >= startDateObject && new Date(pullRequest.updated_at) <= endDateObject) {
            if (pullRequest.state === "closed") {
                pullRequests.closedPrs.push(pullRequest);
            } else {
                pullRequests.openPrs.push(pullRequest);
            }
        }
    });
 
    return pullRequests
}
 
const formatMSTeamRequest = (requestBody) => {
    let platformAndRepo = requestBody.platform.split(" ");
    let platform = platformAndRepo[0].trim();
    console.log("platform")
    console.log(platform)
    let startEndDate = requestBody.startEndDate.split("To");
    if (platform === "GIT") {
        requestBody.url = "https://api.github.com";
    } else if (platform === "BIT") {
        requestBody.url = "https://git.gartner.com";
    } else if (platform === "AZD") {
        requestBody.url = "https://dev.azure.com";
    }
    requestBody.platform = platform;
    let repoName = platformAndRepo[1].split("=")
    requestBody.repositorySlug = repoName[1];
    requestBody.startDate = startEndDate[0].trim() + "T00:00:01";
    requestBody.endDate = startEndDate[1].trim() + "T23:59:59";
    requestBody.projectKey = "DS"
    return requestBody
}
 
const formatMSTeamRequestForAZD = (requestBody) => {
    let platformAndRepo = requestBody.platform.split(" ");
    let platform = platformAndRepo[0].trim();
    console.log("platform")
    console.log(platform)
    let startEndDate = requestBody.startEndDate.split("To");
    if (platform === "GIT") {
        requestBody.url = "https://api.github.com";
    } else if (platform === "BIT") {
        requestBody.url = "https://api.bitbucket.org/2.0";
    } else if (platform === "AZD") {
        requestBody.url = "https://dev.azure.com";
    }
    requestBody.platform = platform;
    let repoName = platformAndRepo[1].split("=")
    requestBody.repositorySlug = repoName[1];
    requestBody.startDate = startEndDate[0].trim();
    requestBody.endDate = startEndDate[1].trim();
 
    return requestBody
}
 
const allCommitsForDev = (allCommits, developer, startDate, endDate) => {
    let allCommitsFromDev = []
    allCommits.forEach(commit => {
        console.log("commit ========================")
        // console.log(commit)
        let authorAndDate = commit.commit.committer;
        if (authorAndDate.name === developer && new Date(authorAndDate.date) >= new Date(startDate) && new Date(authorAndDate.date) <= new Date(endDate)) {
            allCommitsFromDev.push(commit);
        }
    })
 
    return allCommitsFromDev;
}
 
const getAZDRequiredRepo = (allRepos, repoSlug) => {
    let repository = {};
    allRepos.forEach(repo => {
        if (repo.name === repoSlug) {
            repository = repo;
        }
    });
 
    return repository;
 
}
 
const filterPROnDeveloperName = (allPullReqs, developerName) => {
    let allPullRequests = []
    allPullReqs.forEach(pullReq => {
        if (developerName.toLowerCase() === pullReq.createdBy.displayName.toLowerCase()) {
            allPullRequests.push(pullReq);
        }
    });
 
    return allPullRequests;
}
 
module.exports = {
    passwordEncrypt,
    formatBitBucketAllRepoData,
    formatGitHubAllRepoData,
    formatAzureDevRepoData,
    calculateAddedAndRemovedChanges,
    getOpenAndClosedPRsInDateRange,
    formatGitMetricsPerUser,
    formatMSTeamRequest,
    getRepoFromAllReposData,
    allCommitsForDev,
    getBitRepoFromAllRepoData,
    getAZDRequiredRepo,
    filterPROnDeveloperName,
    formatMSTeamRequestForAZD
};

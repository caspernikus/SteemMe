steem.api.setOptions({ url: 'wss://rpc.buildteam.io' });

window.addEventListener('load', onLoad);

var voting_power = 0;
var username = null;
function onLoad() {
	chrome.storage.sync.get(["username"], function(items) {
		username = items.username;
		if (username === undefined || username === null) {
			showError('no_username');
			return;
		}

        getAccountData(username);
	});

	$("#btn-retry").on("click", retryClicked);
	console.log($(".quick_link"));
	$(".quick_link").on("click", linkClicked);

}

function linkClicked(e) {
	switch (e.target.dataset.href) {
		case "steemit":
			window.open('https://steemit.com/@' + username, '_blank');
			break;
		case "busy":
			window.open('https://busy.org/@' + username, '_blank');
			break;
		case "utopian":
			window.open('https://utopian.io/@' + username, '_blank');
			break;
		case "dtube":
			window.open('https://d.tube/#!/c/' + username, '_blank');
			break;
	}
}

function retryClicked() {
	const errorContainer = document.getElementById("error");
	const indicator = document.getElementById("indicator");

	errorContainer.className += " hidden";
	indicator.classList.remove('hidden');

	getAccountData(username);
}

function showError(type) {
	const errorContainer = document.getElementById("error");
	const indicator = document.getElementById("indicator");

	var errorMsg = '';
	switch (type) {
		case 'no_username':
			errorMsg = 'No username provided!';
			break;
		case 'getAcc_failed':
			errorMsg = 'It seems like your entered username is wrong or couldn`t be loaded';
			break;
		case 'getFllw_failed':
			errorMsg = 'Getting Follower & Following Count failed. Please try again';
			break;
	}

	document.getElementById("error_msg").innerHTML = errorMsg;

	indicator.className += " hidden";
	errorContainer.classList.remove('hidden');
}

function calculateRep(rawReputation) {
	const log10 = Math.log10(rawReputation);
	const reputation = ((log10 - 9) * 9) + 25;

	return Math.floor(reputation);
}

function setVotingPower(userData) {
    var secondsago = (new Date - new Date(userData.last_vote_time + "Z")) / 1000;
    var vpow = userData.voting_power + (10000 * secondsago / 432000);
    vpow = Math.min(vpow / 100, 100).toFixed(0);

	const over50 = (vpow > 50) ? ' over50' : ''

    document.getElementById("vote_power_span").innerHTML = vpow + "%";
    document.getElementById("vote_power_progress").className += " p" + vpow + over50;

	voting_power = vpow;
}

function getAccountData(username) {
    var followCount = 0;
    var followingCount = 0;

    const indicator = document.getElementById("indicator");
    const container = document.getElementById("container");

    steem.api.getAccounts([username], function (err, result) {
        if (err || !result || result.length === 0) {
            console.log('Error loading account: ' + err);
			showError('getAcc_failed');
			return;
        }

        const userData = result[0];

		setVotingPower(userData);
		setSteemPower(userData);

        const userAvatar = document.getElementById("user_avatar");
		userAvatar.innerHTML = "<div class='profile-pic' style='background-size: cover; background-repeat: no-repeat; background-position: 50% 50%; background-image: url(https://steemitimages.com/u/"+ userData.name +"/avatar);'></div>" +
		"<div style='margin-left: 10px; flex: 1'><div class='username'>"+ userData.name +" ("+ calculateRep(userData.reputation) +")</div><div id='badges' class='badges'></div></div>";

        const steemBalance = document.getElementById("steem_balance");
        steemBalance.innerHTML = "<div style='font-weight: bold; font-size: 14px'>"+ userData.balance.split(' ')[0] +"</div>" +
		"<div>STEEM</div>";

        const sbdBalance = document.getElementById("sbd_balance");
        sbdBalance.innerHTML = "<div style='font-weight: bold; font-size: 14px'>"+ userData.sbd_balance.split(' ')[0] +"</div>" +
		"<div>SBD</div>";

        steem.api.getFollowCount(username, function(err, result) {
            if (err || !result || result.length === 0) {
                console.log('Error loading follow count: ' + err);
				showError('getFllw_failed');
				return;
            }

            followCount = result.follower_count;
            followingCount = result.following_count;

            const followStata = document.getElementById("badges");
            followStata.innerHTML = "<div class='badge'><span class='oi' data-glyph='person'></span> "+ followingCount +"</div>" +
            "<div class='badge'><span class='oi' data-glyph='people'></span> "+ followCount +"</div>" +
            "<div class='badge'><span class='oi' data-glyph='comment-square'></span> "+ userData.post_count +"</div>";

            // Loaded everthing, so show content!
			indicator.className += " hidden";
			container.classList.remove('hidden');
        });
    });
}

function setSteemPower(userData) {
	const vesting_shares = userData.vesting_shares;
	const del_vesting_shares = userData.delegated_vesting_shares;
	const rec_vesting_shares = userData.received_vesting_shares;

	steem.api.getDynamicGlobalProperties(function(err, result) {
		const total_vesting_shares = result.total_vesting_shares;
     	const total_vesting_fund = result.total_vesting_fund_steem;

		const steem_power = steem.formatter.vestToSteem(vesting_shares, total_vesting_shares, total_vesting_fund);
		const delegated_steem_power= steem.formatter.vestToSteem((rec_vesting_shares.split(' ')[0] - del_vesting_shares.split(' ')[0])+' VESTS', total_vesting_shares, total_vesting_fund);

		const del_steem_power = (delegated_steem_power.toFixed(0) != 0) ? "<div style='font-size: 10px'> ("+ delegated_steem_power.toFixed(2) +")</div>" : "";

		const steemPower = document.getElementById("steem_power");
		steemPower.innerHTML = "<div style='font-weight: bold; font-size: 14px'>"+ steem_power.toFixed(2) +"</div>" +
		"<div>SP</div>" + del_steem_power;

		calculateEstVoteValue(result, steem_power + delegated_steem_power);
	});
}

function calculateEstVoteValue(globalData, steemPower) {
	var totalRewardQuota;

	steem.api.getRewardFund("post", function(e, result) {
		if (result) {
			totalRewardQuota = result.reward_balance.replace(" STEEM", "") / result.recent_claims;
		}

		steem.api.getCurrentMedianHistoryPrice(function(e, t) {
			if (t) {
				var steemSbdRatio = t.base.replace(" SBD", "") / t.quote.replace(" STEEM", "");
				totalQuota = globalData.total_vesting_fund_steem.replace(" STEEM", "") / globalData.total_vesting_shares.replace(" VESTS", "");

				var votingPower = parseInt(voting_power * 100 * (10000) / 1e4);
				votingPower = parseInt((votingPower + 49) / 50);
				var votingWorth = parseInt((steemPower / totalQuota) * votingPower * 100) * totalRewardQuota * steemSbdRatio;

				document.getElementById('upvote_worth').innerHTML += votingWorth.toFixed(4) + " SBD";
			}
		});
	});
}

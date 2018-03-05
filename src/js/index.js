steem.api.setOptions({ url: 'https://api.steemit.com' });

window.addEventListener('load', onLoad);

var voting_power = 0;
var username = null;
var currency = null;
var activeDetailContainer = '';

function onLoad() {
	chrome.storage.sync.get(["username", "currency"], function(items) {
		username = items.username;
		currency = items.currency;
		if (username === undefined || username === null) {
			showError('no_username');
			return;
		}

		if (currency === undefined || currency === null) {
			currency = "usd"
		}

        getAccountData(username);
	});

	$("#btn-retry").on("click", retryClicked);
	$(".quick_link").on("click", linkClicked);

	$("#more_stats").on("click", moreStatisticsClicked);
}

function moreStatisticsClicked(evt) {
	evt.preventDefault();

	if (activeDetailContainer === 'stats') {
		$('#wallet-container').removeClass('hidden');
		$('#links-container').removeClass('hidden');
		$('#stats-detail-container').addClass('hidden');
		activeDetailContainer = '';
		evt.currentTarget.innerHTML = 'More';

		$(window).trigger('resize');
		return;
	}

	$('#wallet-container').addClass('hidden');
	$('#links-container').addClass('hidden');
	$('#stats-detail-container').removeClass('hidden');
	evt.currentTarget.innerHTML = 'Less';
	activeDetailContainer = 'stats';
	$(window).trigger('resize');
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

    $("#vote_power_span")[0].innerHTML = vpow + "%";
    $("#vote_power_progress").addClass('p' + vpow + over50);

	voting_power = vpow;
}

function getAccountData(username) {
    var followCount = 0;
    var followingCount = 0;

    const indicator = $("#indicator");
    const container = $("#container");

    steem.api.getAccounts([username], function (err, result) {
        if (err || !result || result.length === 0) {
            console.log('Error loading account: ' + err);
			showError('getAcc_failed');
			return;
        }

        const userData = result[0];

		setVotingPower(userData);
		setSteemPower(userData);
		calculatePendingPayout();

		$('#steem_price')[0].innerHTML = Number(getSteemPrice("steem", currency)).toFixed(2) + getCurrencySymbol(currency);
		$('#sbd_price')[0].innerHTML = Number(getSteemPrice("steem-dollars", currency)).toFixed(2) + getCurrencySymbol(currency);

        const userAvatar = $("#user_avatar")[0];
		userAvatar.innerHTML = "<div class='profile-pic' style='background-size: cover; background-repeat: no-repeat; background-position: 50% 50%; background-image: url(https://steemitimages.com/u/"+ userData.name +"/avatar);'></div>" +
		"<div style='margin-left: 10px; flex: 1'><div class='username'>"+ userData.name +" ("+ calculateRep(userData.reputation) +")</div><div id='badges' class='badges'></div></div>";

        const steemBalance = $("#steem_balance")[0];
        steemBalance.innerHTML = "<div style='font-weight: bold; font-size: 14px'>"+ userData.balance.split(' ')[0] +"</div>" +
		"<div>STEEM</div>";

        const sbdBalance = $("#sbd_balance")[0];
        sbdBalance.innerHTML = "<div style='font-weight: bold; font-size: 14px'>"+ userData.sbd_balance.split(' ')[0] +"</div>" +
		"<div>SBD</div>";

		// Loaded everthing, so show content!
		indicator.addClass("hidden");
		container.removeClass('hidden');

        steem.api.getFollowCount(username, function(err, result) {
            if (err || !result || result.length === 0) {
                console.log('Error loading follow count: ' + err);
				showError('getFllw_failed');
				return;
            }

            followCount = result.follower_count;
            followingCount = result.following_count;

            const followStata = $("#badges")[0];
            followStata.innerHTML = "<div class='badge'><span class='oi' data-glyph='person'></span> "+ followingCount +"</div>" +
            "<div class='badge'><span class='oi' data-glyph='people'></span> "+ followCount +"</div>" +
            "<div class='badge'><span class='oi' data-glyph='comment-square'></span> "+ userData.post_count +"</div>";
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

		const steemPower = $("#steem_power")[0];
		steemPower.innerHTML = "<div style='font-weight: bold; font-size: 14px'>"+ steem_power.toFixed(2) +"</div>" +
		"<div>SP</div>" + del_steem_power;

		calculateEstVoteValue(result, steem_power + delegated_steem_power);
		calculateBandwidthPercentage(userData, result);
	});
}

function calculatePendingPayout() {
	steem.api.getDiscussionsByBlog({tag: username, limit: 100}, function(err, posts) {
		if (err) {
			console.log(err);
			return;
		}

		var pendingPosts = posts.filter(post => new Date(post.cashout_time).getFullYear() !== 1969);

		var totalPayout = 0;
		var todayPayout = 0;
		pendingPosts.forEach((post) => {
			if (new Date(post.cashout_time).toDateString() === new Date().toDateString()) {
				todayPayout += Number(post.pending_payout_value.replace(' SBD', ''));
			}
			totalPayout += Number(post.pending_payout_value.replace(' SBD', ''));
		});

		$('#pending_payout_span')[0].innerHTML = totalPayout.toFixed(1);
		$('#pending_payout')[0].innerHTML += totalPayout.toFixed(3) + " SBD";
		$('#pending_payout_tdy')[0].innerHTML += todayPayout.toFixed(3) + " SBD";
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

				$('#upvote_worth')[0].innerHTML += votingWorth.toFixed(4) + " SBD";
			}
		});
	});
}

function calculateBandwidthPercentage(userData, globalData) {
	const STEEMIT_BANDWIDTH_AVERAGE_WINDOW_SECONDS = 60 * 60 * 24 * 7;

    const vestingShares = parseFloat(userData.vesting_shares.replace(" VESTS", ""))
    const receivedVestingShares = parseFloat(userData.received_vesting_shares.replace(" VESTS", ""))
    const totalVestingShares = parseFloat(globalData.total_vesting_shares.replace(" VESTS", ""))
    const max_virtual_bandwidth = parseInt(globalData.max_virtual_bandwidth, 10)
    const average_bandwidth = parseInt(userData.average_bandwidth, 10)
    const delta_time = (new Date - new Date(userData.last_bandwidth_update + "Z")) / 1000

    var bandwidthAllocated = (max_virtual_bandwidth  * (vestingShares + receivedVestingShares) / totalVestingShares)
    bandwidthAllocated = Math.round(bandwidthAllocated / 1000000);

    var new_bandwidth = 0
    if (delta_time < STEEMIT_BANDWIDTH_AVERAGE_WINDOW_SECONDS) {
      new_bandwidth = (((STEEMIT_BANDWIDTH_AVERAGE_WINDOW_SECONDS - delta_time) * average_bandwidth) / STEEMIT_BANDWIDTH_AVERAGE_WINDOW_SECONDS)
    }

    new_bandwidth = Math.round(new_bandwidth / 1000000)

	const bandWidthRemaining = parseInt(100 - (100 * new_bandwidth / bandwidthAllocated));
	const over50 = (bandWidthRemaining > 50) ? ' over50' : '';

	$('#bandwidth_used')[0].innerHTML = bytesToSize(new_bandwidth) + " of " + bytesToSize(bandwidthAllocated);
	$("#bandwidth_span")[0].innerHTML = bandWidthRemaining + "%";
    $("#bandwidth_percentage")[0].className += " p" + bandWidthRemaining + over50;
}

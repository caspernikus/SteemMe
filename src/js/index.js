steem.api.setOptions({ url: 'https://api.steemit.com' });

window.addEventListener('load', onLoad);

var voting_power = 0;
var username = null;
var userData = null;
var currency = null;
var active_key = null;
var activeDetailContainer = '';
var total_vesting_fund = '';
var total_vesting_shares = '';

function onLoad() {
	chrome.storage.sync.get(["username", "currency", "active"], function(items) {
		username = items.username;
		currency = items.currency;
		active_key = items.active;
		if (username === undefined || username === null) {
			showError('no_username');
			return;
		}

		if (currency === undefined || currency === null) {
			currency = "usd";
		}

		if (active_key === undefined || active_key === null) {
			active_key = null;
		}

        getAccountData(username);
		getAccountHistory(0, 200, getLastWeekDates(), loadGraph);
	});

	$("#btn-retry").on("click", retryClicked);
	$(".quick_link").on("click", linkClicked);
	$(".button_redeem").on("click", claimRewards);

	$("#more_stats").on("click", moreStatisticsClicked);
	$("#more_wallet").on("click", moreWalletClicked);
}

function getAccountHistory(start, limit, found, callback) {
	if (start === 0) {
		start = -1;
	}

	steem.api.getAccountHistory(username, start, limit, function (err, result) {
		if (err || !result) {
          console.log('Error loading account history: ' + err);
          return;
        }

		result.forEach(function(trans, index) {
			const timestamp = new Date(trans[1].timestamp.split('T')[0]);
			if (!isOlderThanOneWeek(timestamp)) {
				if (trans[1].op[0] !== 'author_reward') {
					if (index === limit) {
						getAccountHistory(trans[0] - limit, limit, found, callback);
					}

					return;
				}
				const op = trans[1].op;
				found[trans[1].timestamp.split('T')[0]].push(op);

				if (index === limit) {
					getAccountHistory(trans[0] - limit, limit, found, callback);
				}
			} else {
				if (index === limit) {
					loadGraph(found);
				}
			}
		});
	});
}

function loadGraph(data) {
	$('#chart-indicator').addClass('hidden');
	$('#myChart').removeClass('hidden');

	const graphData = getGraphData(data, total_vesting_fund, total_vesting_shares);

	$('#total_sbd_payout')[0].innerHTML = '~ ' + calculateTotal(graphData['sbd']).toFixed(2) + ' SBD';
	$('#total_sp_payout')[0].innerHTML = '~ ' + calculateTotal(graphData['sp']).toFixed(2) + ' SP';

	const ctx = document.getElementById("myChart").getContext('2d');
	const chart = new Chart(ctx, {
	    type: 'bar',
	    data: {
	        labels: ["", "", "", "", "", "", ""],
	        datasets: [{
	            label: 'SBD',
	            data: graphData['sbd'],
	            backgroundColor: [
	                'rgba(255, 99, 132, 0.6)',
	                'rgba(255, 99, 132, 0.6)',
	                'rgba(255, 99, 132, 0.6)',
	                'rgba(255, 99, 132, 0.6)',
	                'rgba(255, 99, 132, 0.6)',
	                'rgba(255, 99, 132, 0.6)',
	                'rgba(255, 99, 132, 0.6)',
	            ],
	            borderColor: [
	                'rgba(255, 99, 132, 1)',
	                'rgba(255, 99, 132, 1)',
	                'rgba(255, 99, 132, 1)',
	                'rgba(255, 99, 132, 1)',
	                'rgba(255, 99, 132, 1)',
	                'rgba(255, 99, 132, 1)',
	                'rgba(255, 99, 132, 1)',
	            ],
	            borderWidth: 1
	        },
			{
	            label: 'SP',
	            data: graphData['sp'],
	            backgroundColor: [
	                'rgba(54, 162, 235, 0.6)',
	                'rgba(54, 162, 235, 0.6)',
	                'rgba(54, 162, 235, 0.6)',
	                'rgba(54, 162, 235, 0.6)',
	                'rgba(54, 162, 235, 0.6)',
	                'rgba(54, 162, 235, 0.6)',
	                'rgba(54, 162, 235, 0.6)',
	            ],
	            borderColor: [
	                'rgba(54, 162, 235, 1)',
	                'rgba(54, 162, 235, 1)',
	                'rgba(54, 162, 235, 1)',
	                'rgba(54, 162, 235, 1)',
	                'rgba(54, 162, 235, 1)',
	                'rgba(54, 162, 235, 1)',
	                'rgba(54, 162, 235, 1)',
	            ],
	            borderWidth: 1
	        }]
	    },
	    options: {
			title: {
                display: true,
                text: "Earned last 7 Days"
            },
			tooltips: {
		        enabled: false
		    },
			legend: {
				position: 'bottom',
			},
	        scales: {
	            yAxes: [{
					display: false,
	                ticks: {
	                    beginAtZero:true
	                }
	            }]
	        },
			animation: {
		        duration: 0.1,
		        onComplete: function () {
		            var chartInstance = this.chart,
	                ctx = chartInstance.ctx;
		            ctx.font = Chart.helpers.fontString(Chart.defaults.global.defaultFontSize - 3, Chart.defaults.global.defaultFontStyle, Chart.defaults.global.defaultFontFamily);
		            ctx.textAlign = 'center';
		            ctx.textBaseline = 'bottom';

		            this.data.datasets.forEach(function (dataset, i) {
		                var meta = chartInstance.controller.getDatasetMeta(i);
		                meta.data.forEach(function (bar, index) {
		                    var data = dataset.data[index];
		                    ctx.fillText(data.toFixed(1), bar._model.x, bar._model.y - 10);
		                });
		            });
		        }
		    }
	    }
	});
}

function moreWalletClicked(evt) {
	evt.preventDefault();

	if (activeDetailContainer === 'wallet') {
		$('#stats-container').removeClass('hidden');
		$('#links-container').removeClass('hidden');
		$('#wallet-detail-container').addClass('hidden');
		activeDetailContainer = '';
		evt.currentTarget.dataset.glyph = 'plus';

		$(window).trigger('resize');
		return;
	}

	$('#stats-container').addClass('hidden');
	$('#links-container').addClass('hidden');
	$('#wallet-detail-container').removeClass('hidden');
	evt.currentTarget.dataset.glyph = 'minus';
	activeDetailContainer = 'wallet';
	$(window).trigger('resize');
}

function moreStatisticsClicked(evt) {
	evt.preventDefault();

	if (activeDetailContainer === 'stats') {
		$('#more_wallet').removeClass('hidden');
		$('#links-container').removeClass('hidden');
		$('.stats-detail-container').addClass('hidden');
		activeDetailContainer = '';
		evt.currentTarget.dataset.glyph = 'plus';

		$(window).trigger('resize');
		return;
	}

	$('#more_wallet').addClass('hidden');
	$('#links-container').addClass('hidden');
	$('.stats-detail-container').removeClass('hidden');
	evt.currentTarget.dataset.glyph = 'minus';
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

function claimRewards(e) {
	e.preventDefault();

	$('#reward-indicator').removeClass('hidden');
	$('#rewards-container').addClass('hidden');
	steem.broadcast.claimRewardBalance(active_key, username, '0.000 STEEM', userData.reward_sbd_balance, userData.reward_vesting_balance, function(err, result) {
		if (err) {
			console.log(err);
			return;
		}

		$('#reward-indicator').addClass('hidden');
		getAccountData(username);
	});
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

        userData = result[0];

		setVotingPower(userData);
		setSteemPower(userData);
		calculatePendingPayout();

		setInterval(setUpPricesAndValue, 60 * 1000);

		const user_reward_vesting_steem = Number(userData.reward_vesting_steem.replace(" STEEM", ""))
		const user_reward_sbd_balance = Number(userData.reward_sbd_balance.replace(" SBD", ""))

		if (active_key && active_key !== null && (user_reward_sbd_balance > 0 || user_reward_vesting_steem > 0)) {
			$('#rewards-container').removeClass('hidden');
			var unclaimedString = '';

			if (user_reward_sbd_balance > 0) {
				unclaimedString += user_reward_sbd_balance + 'SBD';
			}

			if (unclaimedString.length > 0) {
				unclaimedString += ' & '
			}

			if (user_reward_vesting_steem > 0) {
				unclaimedString += user_reward_vesting_steem + 'SP';
			}

			$('#rewards-unclaimed')[0].innerHTML = unclaimedString;
		}

        const userAvatar = $("#user_avatar")[0];
		userAvatar.innerHTML = "<div class='profile-pic' style='margin: auto; background-size: cover; background-repeat: no-repeat; background-position: 50% 50%; background-image: url(https://steemitimages.com/u/"+ userData.name +"/avatar);'></div>" +
		"<div style='margin-left: 10px; flex: 1'><div class='username' style='text-align: center'>"+ userData.name +" ("+ calculateRep(userData.reputation) +")</div></div>";

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

	        $("#following_amount")[0].innerHTML = "<div style='font-weight: bold; font-size: 14px; margin-bottom: 5px'>"+ followingCount +"</div>" +
			"<span style='margin: 0px;' class='oi' data-glyph='person'></span>";

	        $("#follower_amount")[0].innerHTML = "<div style='font-weight: bold; font-size: 14px; margin-bottom: 5px'>"+ followCount +"</div>" +
			"<span style='margin: 0px;' class='oi' data-glyph='people'></span>";

	        $("#posts_amount")[0].innerHTML = "<div style='font-weight: bold; font-size: 14px; margin-bottom: 5px'>"+ userData.post_count +"</div>" +
			"<span style='margin: 0px;' class='oi' data-glyph='comment-square'></span>";
        });
    });
}

function setUpPricesAndValue() {
	const steemPrice = Number(getSteemPrice("steem", currency)).toFixed(2);
	const sbdPrice = Number(getSteemPrice("steem-dollars", currency)).toFixed(2);
	const currencySymbol = getCurrencySymbol(currency);

	$('#steem_price')[0].innerHTML = steemPrice + currencySymbol;
	$('#sbd_price')[0].innerHTML = sbdPrice + currencySymbol;

	const sbdBalance = userData.sbd_balance.split(' ')[0];
	const steemBalance = userData.balance.split(' ')[0];
	const steemPower = userData.steem_power;

	const steemValue = (Number(steemBalance) * steemPrice).toFixed(2);
	const spValue = (Number(steemPower) * steemPrice).toFixed(2);
	const sbdValue = (Number(sbdBalance) * sbdPrice).toFixed(2);

	$('#steem_total_value')[0].innerHTML = steemValue + currencySymbol;
	$('#sp_total_value')[0].innerHTML = spValue + currencySymbol;
	$('#sbd_total_value')[0].innerHTML = sbdValue + currencySymbol;
	$('#total_value')[0].innerHTML = (Number(sbdValue) + Number(spValue) + Number(steemValue)).toFixed(2) + currencySymbol;
}

function setSteemPower(userData) {
	const vesting_shares = userData.vesting_shares;
	const del_vesting_shares = userData.delegated_vesting_shares;
	const rec_vesting_shares = userData.received_vesting_shares;

	steem.api.getDynamicGlobalProperties(function(err, result) {
		total_vesting_shares = result.total_vesting_shares;
     	total_vesting_fund = result.total_vesting_fund_steem;

		const steem_power = steem.formatter.vestToSteem(vesting_shares, total_vesting_shares, total_vesting_fund);
		const delegated_steem_power= steem.formatter.vestToSteem((rec_vesting_shares.split(' ')[0] - del_vesting_shares.split(' ')[0])+' VESTS', total_vesting_shares, total_vesting_fund);

		const del_steem_power = (delegated_steem_power.toFixed(0) != 0) ? "<div style='font-size: 10px'> ("+ delegated_steem_power.toFixed(2) +")</div>" : "";

		const steemPower = $("#steem_power")[0];
		steemPower.innerHTML = "<div style='font-weight: bold; font-size: 14px'>"+ steem_power.toFixed(2) +"</div>" +
		"<div>SP</div>" + del_steem_power;

		userData.steem_power = steem_power;

		calculateEstVoteValue(result, steem_power + delegated_steem_power);
		calculateBandwidthPercentage(userData, result);
		setUpPricesAndValue();
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
		$('#pending_payout')[0].innerHTML = '~ ' + totalPayout.toFixed(3) + " SBD";
		$('#pending_payout_tdy')[0].innerHTML = '~ ' + todayPayout.toFixed(3) + " SBD";
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

				$('#upvote_worth')[0].innerHTML = '~ ' + votingWorth.toFixed(4) + " SBD";
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

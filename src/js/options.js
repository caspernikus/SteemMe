var input = null;
var activeInput = null;
var selectCur = null;
window.addEventListener('load', onLoad);

function onLoad() {
	input = $("#username-input");
	activeInput = $("#active-input");
	selectCur = $('#currency_select');

	$("#save").on('click', saveOptions);
	$("#save_active").on('click', saveKey);
	selectCur.change(selectCurrency);

	chrome.storage.sync.get(["username", "currency", "active"], function(items) {
		var username = '';
		if (items.username !== undefined) {
			username = items.username;
		}

		if (items.currency !== undefined) {
			selectCur.val(items.currency);
		}

		if (items.active !== undefined) {
			activeInput.val("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
		}

		input.val(username);
	});
}

function selectCurrency() {
	const currency = selectCur.val();

	chrome.storage.sync.set({
    	currency: currency,
  	}, function() {
    	var status = document.getElementById('status');
    	status.textContent = 'Options saved.';
    	setTimeout(function() {
      		status.textContent = '';
    	}, 750);
  	});
}

function saveOptions() {
	const username = input.val();
	const regex = new RegExp("^[a-z][a-z0-9-]{1,14}[a-z0-9]$", "g");
	const errorContainer = $("#error");

	errorContainer.addClass("hidden");
	if (!regex.test(username)) {
		errorContainer.removeClass('hidden');
		setTimeout(function() {
			errorContainer.addClass("hidden");
    	}, 2000);
		return;
	}

	chrome.storage.sync.set({
    	username: username,
  	}, function() {
    	var status = document.getElementById('status');
    	status.textContent = 'Options saved.';
    	setTimeout(function() {
      		status.textContent = '';
    	}, 750);
  	});
}

function saveKey() {
	const key = activeInput.val();
	const errorContainer = $("#error_key");

	errorContainer.addClass("hidden");
	if (!steem.auth.isWif(key)) {
		errorContainer.removeClass('hidden');
		setTimeout(function() {
			errorContainer.addClass("hidden");
    	}, 2000);
		return;
	}

	chrome.storage.sync.set({
    	active: key,
  	}, function() {
    	var status = document.getElementById('status');
    	status.textContent = 'Options saved.';
    	setTimeout(function() {
			activeInput.val("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
      		status.textContent = '';
    	}, 750);
  	});
}

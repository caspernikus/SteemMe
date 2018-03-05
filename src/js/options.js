var input = null;
var selectCur = null;
window.addEventListener('load', onLoad);

function onLoad() {
	input = $("#username-input");
	selectCur = $('#currency_select');

	$("#save").on('click', saveOptions);
	selectCur.change(selectCurrency);

	chrome.storage.sync.get(["username", "currency"], function(items) {
		var username = '';
		if (items.username !== undefined) {
			username = items.username;
		}

		if (items.currency !== undefined) {
			selectCur.val(items.currency);
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

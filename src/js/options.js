var input = null;
window.addEventListener('load', onLoad);

function onLoad() {
	input = document.getElementById("username-input");
	document.getElementById("save").addEventListener('click', saveOptions);

	chrome.storage.sync.get(["username"], function(items) {
		var username = '';
		if (items.username !== undefined) {
			username = items.username;
		}

		input.value = username;
	});
}

function saveOptions() {
	const username = input.value;
	const regex = new RegExp("^[a-z][a-z0-9-]{1,14}[a-z0-9]$", "g");
	const errorContainer = document.getElementById("error");

	errorContainer.className += " hidden";
	if (!regex.test(username)) {
		errorContainer.classList.remove('hidden');
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

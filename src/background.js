chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
	switch (req.cmd) {
		case "updateDynamicRules": {
			chrome.declarativeNetRequest.getDynamicRules(function (res) {
				let rules = res.map((e) => e.id);
				chrome.declarativeNetRequest.updateDynamicRules(
					{
						addRules: req.rules, //Rule[] optional
						removeRuleIds: rules, //number[] optional
					},
					function (callback) {}
				);
			});
			break;
		}
	}
});

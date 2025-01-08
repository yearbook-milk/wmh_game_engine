// Helpers
function e(id) {
	return document.getElementById(id);
}

function sanitize(dirty) {
	// Will need to be implemented later 
	// Necessary since incoming page content / metadata could contain script tags or other
	// harmful content
	return dirty;
}

// Network
function httpRetrieve(url, callback) {
	// There is no "cache" or "master game file" feature yet, so for now 
	// there will always be a request made over network to retrieve the resource
	if (false) {
		return;
	} else {
		console.log("[postman] Sending XMLHTTP request to retrieve resource @ " + url);
		var xhr = new XMLHttpRequest();
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4 && xhr.status == 200) {
				console.log("[postman] Retrieved resource succesfully!");
				if (xhr.responseText.startsWith("!bundle\n")) {
					// Again, no "master game file" feature yet
					return;
				} else {
					callback(xhr.responseText);
					return;
				}
			} else if (xhr.readyState == 4 && xhr.status != 200) {
				alert("[postman] Error on resource retrieval via network. HTTP code "+xhr.status+"; see console for full response.");
				console.log("[postman] On retrieval, HTTP "+xhr.status+":");
				console.log(xhr.responseText);
				return;
			}
		}
		xhr.open("GET", url);
		xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, max-age=0');
		xhr.setRequestHeader('Expires', 'Thu, 1 Jan 1970 00:00:00 GMT');
		xhr.setRequestHeader('Pragma', 'no-cache');
		xhr.send();
	}	
}


// Gameplay
function clearPage() {
	var exp = e("explanation");
	while (exp.firstChild) {
		exp.removeChild(exp.lastChild);
	}
	var sel = e("choices");
	while (sel.firstChild) {
		sel.removeChild(sel.lastChild);
	}
}

function loadPage(url) {
	var c1 = url.substring(0,1);
	if (c1 != "/") {
		console.log("[gameplay] Invalid or forbidden resource to load; offending URL: "+url);
		alert("Cannot retrieve this page: listed URL is invalid or violates policy: "+ url);
		return;
	}
	clearPage();
	
	function renderPage(content, metadata) {
		e("explanation").innerHTML = sanitize(content); 
		try {
			if (metadata.type == "select") {
				console.log("[gameplay] Page is in SELECT mode.");
				var newChoicesHeader = document.createElement("h1");
				newChoicesHeader.textContent = "Choices";
				e("choices").appendChild(newChoicesHeader);
				for (choice of metadata.choices) {
					var instructions = JSON.stringify(choice.instructions);
					var newButton = document.createElement("button");
					newButton.classList.add("decision_button", "typewriter_font");
					newButton.innerHTML = sanitize(choice.content.replaceAll("\\n", "<br>").replaceAll("\n", "<br>") + " →");
					newButton.instructions = sanitize(choice.instructions);
					e("choices").appendChild(newButton);
					newButton.onclick = function(e){ evaluateInstructions(this.instructions) };
					e("choices").appendChild(document.createElement("br"));
					e("choices").appendChild(document.createElement("br"));
					console.log("[gameplay] Created new button: ", newButton);
				}
			} 
			else if (metadata.type == "probability") {
				console.log("[gameplay] Page is in PROBABILITY mode.");
			}
			else if (metadata.type == "automatic") {
				console.log("[gameplay] Page is in AUTOMATIC mode.");
				console.log("[gameplay] Proceeding to "+metadata.destination+" in "+metadata.delay+" seconds...");
				setTimeout(function() {
					evaluateInstructions("goto "+metadata.destination);
				}, 1000 * Number(metadata.delay));
			}
			else if (metadata.type == "static") {
				console.log("[gameplay] Page is in STATIC mode.");
				// Do nothing, since this is a static page
			}
			else {
				console.log("[gameplay] Invalid page type: "+metadata.type);
				alert("Cannot proceed with option render: invalid page type: "+metadata.type);
				return;
			}
		} catch (e) {
			console.log("[gameplay] Error in rendering page: "+e);
			alert("Cannot proceed with page/option render. Error not specified, see console.");
		}
	}
	
	httpRetrieve(url, function(response) {
		var responseSplit = response.split("====");
		if (responseSplit.length != 2) {
			console.log("[gameplay] No delimiter in page: "+response);
			alert("Cannot proceed with page render: missing or invalid delimiters, see console.");
			return;
		}
		try {
			renderPage(responseSplit[1].trim(), JSON.parse(responseSplit[0]));
			return;
		} catch (e) {
			console.log("[gameplay] Caught JSON parse error; cannot proceed with page load: "+e);
			alert("Cannot proceed with page render: bad JSON metadata package, see console.");
			return;
		}
	});
}


// Evaluation of game instructions
function initEvaluator() {
	window.evaluatorBindings = {};
}

function evaluatorBind(name, fn, blocking = null) {
	console.log("[eval] Created new command with name "+name+"; code = "+fn);
	window.evaluatorBindings[name] = fn;
}

function evaluateInstructions(instructions, counter = 0) {
	var insList = instructions.split(";");
	if (counter > insList.length - 1) {
		console.log("[eval] Finished evaluating instructions (n = "+(counter)+").");
		return;
	}
	var ins = insList[counter].trim();
	var params = ins.split(" ");
	if (window.evaluatorBindings[params[0]] != undefined) {
		window.evaluatorBindings[params[0]](params.slice(1)).then((successMessage) => {
			evaluateInstructions(instructions, counter + 1);
		},
		(failureMessage) => {
			console.log("[eval] Rejected promise; stopping exec. Instruction: ",ins,"; reason: "+failureMessage);
			window.alert("Eval error: rejected Promise on instruction: "+ins+" -- see console.");
			return;
		});
	} else {
		console.log("[eval] Non-recognized command: "+params+" in "+ins);
		window.alert("Eval error: non-recognized command: "+params[0]);
		return;
	}
}

window.onload = function() {
	if (window.localStorage.getItem("nof12") == "enabled") {
			console.log = function(content) {
				document.getElementById("console").innerHTML += content;
				document.getElementById("console").innerHTML += "<br><br>";
			}

			console.warn = function(content) {
				document.getElementById("console").innerHTML += `<b style="color:yellow">${content}</b>`;
				document.getElementById("console").innerHTML += "<br><br>";
			}

			console.error = function(content) {
				document.getElementById("console").innerHTML += `<b style="color:red">${content}</b>`;
				document.getElementById("console").innerHTML += "<br><br>";
			}
	}
	
	initEvaluator();
	evaluatorBind("stop", function(s){return Promise.reject("Execution stopped by user.")});
	evaluatorBind("alert", function(s){alert(s.join(" ")); return Promise.resolve("")});
	evaluatorBind("log", function(s){console.log("[eval]", s.join(" ")); return Promise.resolve("")});
	evaluatorBind("goto", function(s){
		loadPage("/pages/"+s[0]+".html"); 
		return Promise.resolve("");
	});
	evaluatorBind("sfx", function(s) {
		var url = "/sfx/" + s[0];
		return new Promise((resolve, reject) => {
			const audio = new Audio(url);
			audio.onplay = () => {
			  resolve('Sound has started');
			};
			audio.onerror = (error) => {
			  reject('Error playing sound: ' + error);
			};
			audio.play().catch((error) => {
			  reject('Error starting sound: ' + error);
			});
		});
	});
	evaluatorBind("sfx-blocking", function(s) {
		var url = "/sfx/" + s[0];
		return new Promise((resolve, reject) => {
			const audio = new Audio(url);
			audio.onended = () => {
			  resolve('Sound has finished playing');
			};
			audio.onerror = (error) => {
			  reject('Error playing sound: ' + error);
			};
			audio.play().catch((error) => {
			  reject('Error starting sound: ' + error);
			});
		});
	});
	
	evaluateInstructions("goto test_root");
}
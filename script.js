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
				console.log("On retrieval, HTTP "+xhr.status+":");
				console.log(xhr.responseText);
				return;
			}
		}
		xhr.open("GET", url);
		xhr.send();
	}	
}


// Gameplay
function clearPage(recreateChoicesHeader = true) {
	var exp = e("explanation");
	while (exp.firstChild) {
		exp.removeChild(exp.lastChild);
	}
	var sel = e("choices");
	while (sel.firstChild) {
		sel.removeChild(sel.lastChild);
	}
	
	if (recreateChoicesHeader) {
		var newChoicesHeader = document.createElement("h1");
		newChoicesHeader.textContent = "Choices";
		sel.appendChild(newChoicesHeader);
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
		console.log("M" + metadata);
		e("explanation").innerHTML = sanitize(content); 
		if (metadata.type == "select") {
			console.log("[gameplay] Page is in SELECT mode.");
		} 
		else if (metadata.type == "probability") {
			console.log("[gameplay] Page is in PROBABILITY mode.");
		}
		else {
			console.log("[gameplay] Invalid page type: "+metadata.type);
			alert("Cannot proceed with option render: invalid page type: "+metadata.type);
			return;
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

if (false) {
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
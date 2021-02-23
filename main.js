// Copyright (c) 2017 Matthew Brennan Jones <matthew.brennan.jones@gmail.com>
// This software is licensed under a MIT License
// https://github.com/workhorsy/uncompress.js


function httpRequest(url, method, cb, responseType) {
	let xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (this.readyState === 4) {
			cb(this.response, this.status);
		} else if (this.readyState === 0) {
			cb(null);
		}
	};
	xhr.onerror = function() {
		cb(null);
	};
	xhr.open(method, url, true);
	xhr.timeout = 50000;
	xhr.responseType = responseType;
	xhr.send(null);
}

function onArchiveLoaded(archive) {
	var entryList = document.getElementById('entryList');

	archive.entries.forEach(function(entry) {
		if (! entry.is_file) return;

		entry.readData(function(data, err) {
			var url = URL.createObjectURL(new Blob([data]));

			entryList.innerHTML +=
			'<a href="' + url + '" download="' + entry.name + '">' + entry.name + '</a>' + '<br />' +
			'<b>Compressed Size:</b> ' + entry.size_compressed + '<br />' +
			'<b>Uncompressed Size:</b> ' + entry.size_uncompressed + '<br />' +
			'<b>Is File:</b> ' + entry.is_file + '<br />';

			entryList.innerHTML += '<hr />';
		});
	});
}

// Load all the archive formats
loadArchiveFormats(['rar', 'zip', 'tar'], function() {
	var button = document.getElementById('go');
	button.innerHTML = "Download and extract";
	button.disabled = false;
});

document.getElementById('go').addEventListener('click', function() {
	var entryList = document.getElementById('entryList');
	entryList.innerHTML = '';

	var url = document.getElementById('download_url').value;
	httpRequest(url, 'GET', function(response, status) {
		if (status === 200) {
			var fileReader = new FileReader();
			fileReader.onload = function() {
				var array_buffer = this.result;

				// Open the file as an archive
				var archive = archiveOpenArrayBuffer("1.tar", '', array_buffer);
				if (archive) {
					console.info('Uncompressing ' + archive.archive_type + ' ...');
					entryList.innerHTML = '';
					onArchiveLoaded(archive);
				} else {
					entryList.innerHTML = '<span style="color: red">' + err + '</span>';
				}
			};
			fileReader.readAsArrayBuffer(response);
		} else {
			console.error("Failed to download file with status: ", status);
		}
	}, 'blob');
});

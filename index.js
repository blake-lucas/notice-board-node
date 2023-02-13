const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(__dirname + '/notice_board.db');
const express = require('express');
const https = require('https');
const app = express();
app.use(express.static(__dirname + '/static'));
const events = require('events');
const emitter = new events.EventEmitter();
emitter.setMaxListeners(1000);

// Load the fs module
const fs = require('fs');

// Read the configuration file
const config = JSON.parse(fs.readFileSync(__dirname + '/config.json'));

// Set config properties
const ip = config.ip
const port = config.port

function log(message) {
	const date = new Date();
	const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
	const logMessage = formattedDate + ': ' + message;
	
	console.log(logMessage)

	fs.appendFile(__dirname + '/notice_board.log', logMessage + '\n', function(err) {
	if (err) {
		console.log('Error writing to log file: ' + err);
	}
	});
}


// Create the messages table if it does not exist
db.run('CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, content TEXT, timestamp INTEGER)');

// Create the archive table if it does not exist
db.run('CREATE TABLE IF NOT EXISTS archive (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, content TEXT, timestamp INTEGER)');

// Retrieve all messages from the messages table
function get_messages() {
	return new Promise((resolve, reject) => {
		db.all('SELECT * FROM messages', (err, rows) => {
			if (err) {
				reject(err);
			}
            else {
				resolve(rows);
			}
		});
	});
}

// Add a message to the messages table
function add_message(name, content) {
	// Get the current unix timestamp
	const timestamp = Date.now();

	// Filter out illegal characters from the name and content
	name = name.replace(/[<>]/g, '');
	content = content.replace(/[<>]/g, '');

	// Check if the name or content is empty after filtering
	if (!name.trim() || !content.trim()) {
		return Promise.resolve();
	}

	// If the message content is /bunny, change the content of the message to gif tag
	if (content == "/bunny") {
		content = '<img src=/assets/img/happy_bunny.gif height="200" width="307">'
	}

	// Same thing but for snickles
	if (content == "/snickles") {
		content = '<img src=/assets/img/snickles.jpg height="270" width="360">'
	}

	return new Promise((resolve, reject) => {
		db.run(
			'INSERT INTO messages (name, content, timestamp) VALUES (?, ?, ?)',
			[name, content, timestamp],
			function(err) {
				if (err) {
					reject(err);
				}
				else {
					// Emit a 'message' event with the new message data
					emitter.emit('message', {
						id: this.lastID,
						name,
						content,
						timestamp
					});
					log('Received new message with ID ' + this.lastID + ' from "' + name + '" with content "' + content + '"')
					resolve(this.lastID);
				}
			}
		);
	});
}

// Delete a message from the messages table by its ID
function delete_message(id) {
	return new Promise((resolve, reject) => {
		db.run('DELETE FROM messages WHERE id = ?', [id], function(err) {
			if (err) {
				reject(err);
			}
			else {
				// Emit a 'delete' event with the message ID
				emitter.emit('delete', {
					id: id
				});
				log('Deleted message ID ' + id + " from live message table")
				resolve(this.changes);
			}
		});
	});
}

// Archive a message by moving it from the messages table to the archive table
function archive_message(id) {
    return new Promise((resolve, reject) => {
        db.get('SELECT name, content, timestamp FROM messages WHERE id = ?', [id], (err, row) => {
            if (err) {
                reject(err);
            }
            else {
                db.run('INSERT INTO archive (name, content, timestamp) VALUES (?, ?, ?)', [row.name, row.content, row.timestamp], function(err) {
                    if (err) {
                        reject(err);
                    } 
                    else {
                        // Emit a 'delete' event to delete the message from the front-end
                        emitter.emit('delete', { id });
                        delete_message(id)
                            .then(() => resolve(this.lastID))
                            .catch((err) => reject(err));
						log('Moved message ID ' + id + "to archive table")
                    }
                });
            }
        });
    });
}

// Parse request bodies as JSON
app.use(express.json());

// Retrieve all messages
app.get('/messages', (req, res) => {
	get_messages()
		.then((messages) => res.json(messages))
		.catch((err) => res.status(500).json({
			error: err.message
		}));
});

// Add a message
app.post('/messages', (req, res) => {
	add_message(req.body.name, req.body.content)
		.then((id) => res.json({
			id
		}))
		.catch((err) => res.status(500).json({
			error: err.message
		}));
});

// Delete a message
app.delete('/messages/:id', (req, res) => {
	delete_message(req.params.id)
		.then((changes) => res.json({
			changes
		}))
		.catch((err) => res.status(500).json({
			error: err.message
		}));
});

// Archive a message
app.post('/messages/:id/archive', (req, res) => {
	archive_message(req.params.id)
		.then((id) => res.json({
			id
		}))
		.catch((err) => res.status(500).json({
			error: err.message
		}));
});

// Create a GET route for the event emitter
app.get('/messages/live', (req, res) => {
	// Set the response type to 'text/event-stream'
	res.set('Content-Type', 'text/event-stream');

	// Listen for 'message' events from the emitter
	emitter.on('message', (data) => {
		// Send a 'message' event with the data to the client
		res.write(`event: message\n`);
		res.write(`data: ${JSON.stringify(data)}\n\n`);
	});
	emitter.on('delete', (data) => {
		// The 'data' argument will contain the ID of the message to be deleted
		// You can use this ID to delete the message from the database
		// console.log("Received delete req for" + data)
		res.write(`event: delete\n`);
		res.write(`data: ${JSON.stringify(data)}\n\n`);
	});	
});

// Load SSL certificates
var key = fs.readFileSync(__dirname + '/ssl/privkey.pem');
var cert = fs.readFileSync(__dirname + '/ssl/fullchain.pem');
var options = {
  key: key,
  cert: cert
};

var server = https.createServer(options, app);

server.listen(port, ip, () => {
	console.log(`Notice board listening at https://${ip}:${port}`);
});
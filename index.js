const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('notice_board.db');
const express = require('express');
const app = express();
const port = 3000;
const events = require('events');
const emitter = new events.EventEmitter();

// Create the messages table if it does not exist
db.run('CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, content TEXT, timestamp INTEGER)');

// Create the archive table if it does not exist
db.run('CREATE TABLE IF NOT EXISTS archive (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, content TEXT, timestamp INTEGER)');

// Retrieve all messages from the messages table
function getMessages() {
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

app.use(express.static('static'));

// Add a message to the messages table
function addMessage(name, content) {
	// Get the current unix timestamp
	const timestamp = Date.now();

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

					resolve(this.lastID);
				}
			}
		);
	});
}

// Delete a message from the messages table by its ID
function deleteMessage(id) {
	return new Promise((resolve, reject) => {
		db.run('DELETE FROM messages WHERE id = ?', [id], function(err) {
			if (err) {
				reject(err);
			} else {
				resolve(this.changes);
			}
		});
	});
}

// Archive a message by moving it from the messages table to the archive table
function archiveMessage(id) {
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
						deleteMessage(id)
							.then(() => resolve(this.lastID))
							.catch((err) => reject(err));
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
	getMessages()
		.then((messages) => res.json(messages))
		.catch((err) => res.status(500).json({
			error: err.message
		}));
});

// Add a message
app.post('/messages', (req, res) => {
	addMessage(req.body.name, req.body.content)
		.then((id) => res.json({
			id
		}))
		.catch((err) => res.status(500).json({
			error: err.message
		}));
});

// Delete a message
app.delete('/messages/:id', (req, res) => {
	deleteMessage(req.params.id)
		.then((changes) => res.json({
			changes
		}))
		.catch((err) => res.status(500).json({
			error: err.message
		}));
});

// Archive a message
app.post('/messages/:id/archive', (req, res) => {
	archiveMessage(req.params.id)
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
});

app.listen(port, () => console.log(`Notice board listening at http://localhost:${port}`));
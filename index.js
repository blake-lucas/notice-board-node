const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('notice_board.db');
const express = require('express');
const app = express();
const events = require('events');
const emitter = new events.EventEmitter();
emitter.setMaxListeners(200);

// Function to log the number of listeners for each event
function log_listeners() {
    // Get a list of all the events with listeners attached
    const event_names = emitter.eventNames();

    // Loop over the list of event names
    for (const event_name of event_names) {
        // Console.log the number of listeners for each event
        console.log(`${event_name}: ${emitter.listenerCount(event_name)}`);
    }
}

setInterval(log_listeners, 5000);

// Load the fs module
const fs = require('fs');

// Read the configuration file
const config = JSON.parse(fs.readFileSync('config.json'));

const port = config.port

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

app.use(express.static('static'));

// Add a message to the messages table
function add_message(name, content) {
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
function delete_message(id) {
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
		const timeout = setTimeout(() => {
			// If the listener does not respond within the time limit, close the connection
			console.log('Listener is unresponsive, closing connection...');
			// Your code for closing the connection goes here...
		}, 5000);

		// Send a 'message' event with the data to the client
		res.write(`event: message\n`);
		res.write(`data: ${JSON.stringify(data)}\n\n`);

		// If the listener responds before the time limit, clear the timeout and continue processing the event
		clearTimeout(timeout);
	});
	emitter.on('delete', (data) => {
		const timeout = setTimeout(() => {
			// If the listener does not respond within the time limit, close the connection
			console.log('Listener is unresponsive, closing connection...');
			// Your code for closing the connection goes here...
		}, 5000);

		// The 'data' argument will contain the ID of the message to be deleted
		// You can use this ID to delete the message from the database
		delete_message(data.id)
			.then(() => console.log(`Message with ID ${data.id} was deleted`))
			.catch((err) => console.error(err));

		// If the listener responds before the time limit, clear the timeout and continue processing the event
		clearTimeout(timeout);
	});	
});

app.listen(port, () => console.log(`Notice board listening at http://localhost:${port}`));
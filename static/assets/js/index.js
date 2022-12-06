document.addEventListener('DOMContentLoaded', function() {
	//Load message modal
	var message_modal = document.getElementById("new-message")
	var instance = M.Modal.init(message_modal)

	//Load time and date
	looped_functions()
	var main_loop = setInterval(looped_functions, 1000)
});

function looped_functions() {
	update_date()
	// auto_hide_button()
}

function update_date() {
	var time_date = document.getElementById("time-date")
	var current_date = new Date()
	var formatted_time = current_date.toLocaleTimeString('en-US')
	var formatted_date = current_date.toLocaleDateString('en-us', {
		weekday: "long",
		year: "numeric",
		month: "short",
		day: "numeric"
	})
	time_date.innerHTML = formatted_date + " " + formatted_time
}

// Function to hide buttons
function hide_buttons() {
	var buttons = document.getElementsByClassName('message-button')
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].style.display = 'none'
	}
}
// Function to show buttons
function show_buttons() {
	var buttons = document.getElementsByClassName('message-button')
	for (var i = 0; i < buttons.length; i++) {
		buttons[i].style.display = 'inline-block'
	}
}

function toggle_message_buttons() {
	// Get all elements with the 'message-button' class
	var buttons = document.getElementsByClassName('message-button')

	// Check if any of the buttons are currently visible
	var is_visible = false
	for (var i = 0; i < buttons.length; i++) {
		if (buttons[i].style.display === 'block') {
		is_visible = true
		break
		}
	}

	// If any of the buttons are currently visible, hide them all
	if (is_visible) {
		for (var i = 0; i < buttons.length; i++) {
		buttons[i].style.display = 'none'
		}
	}
	// Otherwise, show them all
	else {
		for (var i = 0; i < buttons.length; i++) {
		buttons[i].style.display = 'block'
		}
	}
}
  
function isCursorInBottomRightCorner() {
	// Get the dimensions of the web page
	var pageWidth = document.documentElement.offsetWidth
	var pageHeight = document.documentElement.offsetHeight
  
	// Get the current cursor position
	var cursorX = window.event.clientX
	var cursorY = window.event.clientY
  
	// Check if the cursor is within 10% of the bottom right corner of the web page
	if (cursorX >= pageWidth * 0.9 && cursorY >= pageHeight * 0.9) {
	  return true
	}
	else {
	  return false
	}
  }
  
document.addEventListener('mousemove', function() {
	var showButtons = isCursorInBottomRightCorner()
	var mpButton = document.getElementById('mp-button')
  
	// Show or hide the mp-button div based on the cursor position
	if (showButtons) {
	  mpButton.style.display = 'block'
	}
	else {
	  mpButton.style.display = 'none'
	}
})

class Message {
	constructor(id, username, content, timestamp) {
	  this.id = id
	  this.name = username
	  this.message = content
	  this.time = timestamp
	}
  
	get formatted() {
		var row = document.createElement('div')
		row.className = 'row'
		row.id = this.id
	
		var hr = document.createElement('hr')
	
		var name_col = document.createElement('div')
		name_col.className = 'col s1 center-align'
		name_col.innerHTML = this.name
	
		var message_col = document.createElement('div')
		message_col.className = 'col s9'
		message_col.style.wordWrap = 'break-word'
		message_col.innerHTML = this.message
	
		var date = new Date(this.time)
		// console.log(date)
		var time_col = document.createElement('div')
		time_col.className = 'col s2 right-align'
		time_col.innerHTML = (date.getMonth() + 1) + '/' + date.getDate() + ' ' + date.toLocaleTimeString('en-US')

		// Add buttons to the message element
		var archive_button = document.createElement('button')
		archive_button.className = 'message-button btn-small mp-button archive'
		archive_button.innerHTML = 'Archive'
		// Pass the id of the current message element to the archive_message function
		archive_button.addEventListener('click', function() {
			archive_message(row.id)
		})
		// Hide the button by default
		archive_button.style.display = 'none'
	
		var delete_button = document.createElement('button')
		delete_button.className = 'message-button btn-small mp-button delete_forever'
		delete_button.innerHTML = 'Delete'
		// Pass the id of the current message element to the delete_message function
		delete_button.addEventListener('click', function() {
			delete_message(row.id)
		})
		// Hide the button by default
		delete_button.style.display = 'none'

		row.appendChild(hr)
		row.appendChild(name_col)
		row.appendChild(message_col)
		row.appendChild(time_col)
		row.appendChild(archive_button)
		row.appendChild(delete_button)

		return row
	}
}

const eventSource = new EventSource('/messages/live');

eventSource.addEventListener('message', (event) => {
	console.log(event.type)
	const data = JSON.parse(event.data);
	console.log(data);
    // Add the message element to the messages container
	// console.log("Event was a new message")
	create_message(data.id, data.name, data.content, data.timestamp);
});

eventSource.addEventListener('delete', (event) => {
    const data = JSON.parse(event.data);
	// console.log("Event was a delete event")
    // Delete the message from the messages container
	delete_message_object(data.id);
});


// Create message object on the page itself
function create_message(id, name, content, timestamp) {
	var message_object = new Message(id, name, content, timestamp).formatted
	document.getElementById("message-container").appendChild(message_object)
}

// Send message to back end using POST request
const send_message = () => {
	var name = document.getElementById("name").value
	var content = document.getElementById("message").value
  
	fetch('/messages', {
	  method: 'POST',
	  headers: {
		'Content-Type': 'application/json'
	  },
	  body: JSON.stringify({
		name,
		content
	  })
	})
	.then((response) => response.json())
	.then((data) => {
	  // When the new message is added, call the create_message function
	  // to add it to the UI
	  // create_message(data.id, name, content, Date.now());
  
	  // Clear the input fields
	  document.getElementById("name").value = ""
	  document.getElementById("message").value = ""
	});
}

// Retreive messages from the back end with GET request
const get_messages = () => {
	fetch('/messages')
	.then((res) => res.json())
	.then((data) => {
		data.forEach((msg) => {
			// console.log(msg)
			create_message(msg.id, msg.name, msg.content, msg.timestamp)
		})
	})
	.catch((err) => console.error(err));
};

// Request all messages on initial page load
get_messages();

const archive_message = (id) => {
	const messageElement = document.getElementById(id);
    if (messageElement) {
        messageElement.parentNode.removeChild(messageElement);
    }
    fetch(`/messages/${id}/archive`, {
      method: 'POST'
    })
      .then((res) => res.json())
      .then((data) => {
        // Do something with the data
      })
      .catch((err) => console.error(err));
  };
const delete_message = (id) => {
	fetch(`/messages/${id}`, {
			method: 'DELETE'
		})
		.then((res) => res.json())
		.then((data) => {
			// Do something with the data
		})
		.catch((err) => console.error(err));
};
const delete_message_object = (id) => {
	const messageElement = document.getElementById(id);
    if (messageElement) {
        messageElement.parentNode.removeChild(messageElement);
    }
};
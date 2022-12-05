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

//If page is full screened, hide bottom right button 
// function auto_hide_button() {
//     if(1 >= outerHeight - innerHeight) {
//         document.getElementById("mp-button").style.display = "none"
//     }
//     else {
//         document.getElementById("mp-button").style.display = "block"
//     }
// }

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

		row.appendChild(hr)
		row.appendChild(name_col)
		row.appendChild(message_col)
		row.appendChild(time_col)

		return row
	}
}

const eventSource = new EventSource('/messages/live');

eventSource.onmessage = (event) => {
	const data = JSON.parse(event.data);
    // Check if the received event is a 'message' event or a 'delete' event
    if (data.event === 'message') {
        // Add the message element to the messages container
        create_message(data.id, data.name, data.content, data.timestamp);
    }
	else if (data.event === 'delete') {
        // Delete the message from the messages container
        delete_message(data.id);
    }
};

function create_message(id, name, content, timestamp) {
	// var fake_msg = {message: "hellohellohellohellohellohellohellsohellohellohellohellohe llohellohello", name: 'Blake', time: 1664249726797}
	var message_object = new Message(id, name, content, timestamp).formatted
	document.getElementById("message-container").appendChild(message_object)
}

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
            create_message(data.id, name, content, Date.now());
        });
}


const getMessages = () => {
	fetch('/messages')
	.then((res) => res.json())
	.then((data) => {
		data.forEach((msg) => {
			console.log(msg)
			create_message(msg.id, msg.name, msg.content, msg.timestamp)
		})
	})
	.catch((err) => console.error(err));
};

// Request all messages
getMessages();

const archiveMessage = (id) => {
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
const deleteMessage = (id) => {
	const messageElement = document.getElementById(id);
    if (messageElement) {
        messageElement.parentNode.removeChild(messageElement);
    }
	fetch(`/messages/${id}`, {
			method: 'DELETE'
		})
		.then((res) => res.json())
		.then((data) => {
			// Do something with the data
		})
		.catch((err) => console.error(err));
};
import {
  string_checker,
  id_checker
} from '../../data/errorchecking.js';

let status_update_form = document.getElementById('status_update-form');
let verify_form = document.getElementById('verify-form');
let comment_form = document.getElementById('comment-form');
let incident_create_form = document.getElementById('incident_create-form');
let incident_update_form = document.getElementById('incident_update-form');
let like_form = document.getElementById('like-form');
let status = document.getElementById('status');
let content = document.getElementById('content');
let verify = document.getElementById('verify');
let category = document.getElementById('category');
let Title = document.getElementById('Title');
let description = document.getElementById('description');
let location = document.getElementById('location');
let errorDiv = document.getElementById('error');
let frmLabel = document.getElementById('formLabel');
if(status_update_form){
    status_update_form.addEventListener('submit', (event) => {
        event.preventDefault();
        if(status){
            string_checker(status);
        }
        if(content){
            string_checker(content);
            if (content.length > 500){
                throw "Error: content cannot be longer than 500 characters";
            }
        }
    });
}

if(verify_form){
    verify_form.addEventListener('submit', (event) => {
        event.preventDefault();
        if(verify){
            string_checker(verify);
        }
        if(content){
            string_checker(content);
            if (content.length > 500){
                throw "Error: content cannot be longer than 500 characters";
            }
        }
    });
}

if(comment_form){
    comment_form.addEventListener('submit', (event) => {
        event.preventDefault();
        if(content){
            content = string_checker(content.value);
            if (content.length > 500){
                throw "Error: content cannot be longer than 500 characters";
            }
        }
        let requestConfig = {
            url: comment_form.action,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({content: content})
        }
        $.ajax(requestConfig).then((response) => {
            $('#comments-list').append(`<li>${response.comment.content}</li>`);
            $('#content').val('');
            $('#error').hide();
        })
    });
}

if(incident_create_form){
    incident_create_form.addEventListener('submit', (event) => {
        event.preventDefault();
        if(category){
            string_checker(category);
            if (category.length > 100){
                throw "Error: category cannot be longer than 100 characters";
            }
        }
        if(Title){
            string_checker(Title);
            if (Title.length > 100){
                throw "Error: title cannot be longer than 100 characters";
            }
        }
        if(description){
            string_checker(description);
            if (description.length > 500){
                throw "Error: content cannot be longer than 500 characters";
            }
        }
        if(location){
            string_checker(location);
            if (location.length > 100){
                throw "Error: location cannot be longer than 100 character";
            }
        }
    });
}

if(incident_update_form){
    incident_update_form.addEventListener('submit', (event) => {
        event.preventDefault();
        if(category){
            string_checker(category);
            if (category.length > 100){
                throw "Error: category cannot be longer than 100 characters";
            }
        }
        if(Title){
            string_checker(Title);
            if (Title.length > 100){
                throw "Error: title cannot be longer than 100 characters";
            }
        }
        if(description){
            string_checker(description);
            if (description.length > 500){
                throw "Error: content cannot be longer than 500 characters";
            }
        }
        if(location){
            string_checker(location);
            if (location.length > 100){
                throw "Error: location cannot be longer than 100 character";
            }
        }
    });
}

if (like_form){
    comment_form.addEventListener('submit', (event) => {
        event.preventDefault();
        let requestConfig = {
            url: like_form.action,
            method: 'POST',
            contentType: 'application/json',
        }
        $.ajax(requestConfig).then((response) => {
            $('#likes').text(`likes: ${response.likes}`);
        })
    });
}
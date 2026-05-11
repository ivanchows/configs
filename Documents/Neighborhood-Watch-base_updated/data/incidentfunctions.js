import {incidents} from '../config/mongoCollections.js';
import {notifications} from '../config/mongoCollections.js';
import {comments} from '../config/mongoCollections.js';
import {users} from '../config/mongoCollections.js';

import{
    id_checker,
    string_checker
} from "./errorchecking.js"

import {ObjectId} from 'mongodb';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'live.smtp.mailtrap.io',
  port: 587,
  secure: false,
  auth: {
    user: '1a2b3c4d5e6f7g',
    pass: '1a2b3c4d5e6f7g',
  }
});

async function geocodeLocation(location) {
    try {
        const url = 'https://nominatim.openstreetmap.org/search?q=' +
            encodeURIComponent(location) + '&format=json&limit=1';
        const res = await fetch(url, {
            headers: { 'User-Agent': 'SentryNeighborhoodWatch/1.0 (cs546project)' }
        });
        if (!res.ok) return null;
        const data = JSON.parse(await res.text());
        if (!data || data.length === 0) return null;
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch (_) {
        return null;
    }
}

const createIncident = async(
    category,
    Title,
    description,
    location,
    reportedBy,
    user_id
) => {
    //Error checking for category
    category = string_checker(category);
    if (category.length > 100){
        throw "Error: category cannot be longer than 100 characters";
    }

    //postedDate creation
    let today = new Date();
    let day = String(today.getDate()).padStart(2, '0');
    let current_month = String(today.getMonth() + 1).padStart(2, '0');
    let current_year = today.getFullYear();
    let postedDate = current_month + "/" + day + "/" + current_year;

    //Title Error checking
    Title = string_checker(Title);
    if (Title.length > 100){
        throw "Error: title cannot be longer than 100 characters"
    }

    //Description Error checking
    description = string_checker(description);
    if (description.length > 500){
        throw "Error: description cannot be longer than 500 characters";
    }

    //location error checking
    location = string_checker(location);
    if (location.length > 100){
        throw "Error: location cannot be longer than 100 characters";
    }

    //grab username and error check
    reportedBy = string_checker(reportedBy);

    //grab user_id and error check
    user_id = id_checker(user_id);

    let status = "Active";
    let likes = 0;
    let likedBy = [];
    let notifList = [];
    let commentList = [];

    const coords = await geocodeLocation(location);
    const lat = coords ? coords.lat : null;
    const lng = coords ? coords.lng : null;

    //Build object
    let newIncident = {
        category: category,
        postedDate: postedDate,
        Title: Title,
        description: description,
        location: location,
        reportedBy: reportedBy,
        userId: user_id,
        verified: "",
        status: status,
        likes: likes,
        likedBy: likedBy,
        lat: lat,
        lng: lng,
        notifications: notifList,
        comments: commentList
    };
    const incident_collection = await incidents();
    const insert_incident = await incident_collection.insertOne(newIncident);
    if (!insert_incident.acknowledged || !insert_incident.insertedId){
        throw "Error: could not add incident";
    }

   //grab user collection to send emails:
    let user_collection = await users();
    try{
        let user_collection = await users();
        let emailed_users = await user_collection.find({location: location}).toArray();
        let emailed_users_length = emailed_users.length;
        for(let i = 0; i < emailed_users_length; i++){
            let user_location = emailed_users[i].location;
            if (user_location === location){
                let email = emailed_users[i].email;
                const mailOptions = {
                    from: 'sentryCS546@gmail.com',
                    to: email,
                    subject: 'New Incident Reported in your area!',
                    text: 'Hello, a new incident has been created in your area. Ig attach incident_id here idk can edit message later'
                };
                await transporter.sendMail(mailOptions); 
                console.log("Email Sent!");
            }
        }
    } catch(e){
        console.log("Email failed:", e);
    }
    //update users created incidents field
    let updated_user = await user_collection.findOneAndUpdate({_id: new ObjectId(user_id)}, 
    {$push: {filedReports: insert_incident.insertedId}
    })
    if (!updated_user){
        throw "Error: could not update user";
    }
    
    let result = {
        _id: insert_incident.insertedId.toString(),
        category: category,
        postedDate: postedDate,
        Title: Title,
        description: description,
        location: location,
        reportedBy: reportedBy,
        userId: user_id,
        verified: "",
        status: status,
        likes: likes,
        notifications: notifList,
        comments: commentList
  };
  return result;
}


const getAllIncidents = async() => {
    let result = [];
    const incident_collection = await incidents();
    if (!incident_collection){
        throw "Error: could not find all incidents";
    }
    result = await incident_collection.find({}).toArray();
    return result;
}

const getOneIncident = async(id) => {
    //Error check the id
    id = id_checker(id);

    //find incident with id
    let incident_collection = await incidents();
    const incident = await incident_collection.findOne({_id: new ObjectId(id)});
    if (!incident){
        throw "Error: could not find incident with desired id";
    }
    return incident;
}

const verifyIncident = async(
    id,
    verify,
    user_role
) => {
    //id error checking
    id = id_checker(id);

    //user role error checks
    user_role = string_checker(user_role);
    if (user_role !== "admin"){
        throw "Error: user_role must be admin";
    }

    //verify error checking
    verify = string_checker(verify);
    verify = verify.toLowerCase();
    if (verify !== "yes" && verify !== "no"){
        throw "Error: verify can only be yes or no";
    }

    //grab incident for update
    let incident_collection = await incidents();
    const incident = await incident_collection.findOne({_id: new ObjectId(id)});
    if (!incident){
        throw "Error: could not find incident with desired id";
    }
    let updated_incident = {
        category: incident.category,
        postedDate: incident.postedDate,
        Title: incident.Title,
        description: incident.description,
        location: incident.location,
        reportedBy: incident.reportedBy,
        userId: incident.userId,
        verified: verify,
        status: incident.status,
        likes: incident.likes || 0,
        notifications: incident.notifications,
        comments: incident.comments
    };
    await incident_collection.updateOne({_id: new ObjectId(id)}, {$set: updated_incident});
    let updated = await incident_collection.findOne({_id: new ObjectId(id)});
    if (!updated){
        throw "Error: incident could not be verified";
    }
    const user_collection = await users();
    let updated_user = await user_collection.findOneAndUpdate({_id: new ObjectId(updated.userId)}, 
    {$push: {verifiedReports: updated._id}
    })
    if (!updated_user){
        throw "Error: could not update user";
    }
    let message = "incident has been verified!";
    return message;

}

const updateStatus = async(
    id,
    status,
    user_role,
    user_id
) => {
    //id error checking
    id = id_checker(id);

    // Allow admins or the incident owner
    const incident_collection_check = await incidents();
    const incidentForCheck = await incident_collection_check.findOne({_id: new ObjectId(id)});
    if (!incidentForCheck) throw "Error: could not find incident with desired id";
    const isAdmin = string_checker(user_role) === "admin";
    const isOwner = incidentForCheck.userId === user_id;
    if (!isAdmin && !isOwner) {
        throw "Error: you must be an admin or the incident owner to update status";
    }

    //status error checking
    status = string_checker(status);
    status = status.toLowerCase();
    if (status !== "active" && status !== "resolved" && status !== "authorities notified"){
        throw "Error: status can only be active, resolved, or authorities notified";
    }

    //grab incident for update
    let incident_collection = await incidents();
    const incident = await incident_collection.findOne({_id: new ObjectId(id)});
    if (!incident){
        throw "Error: could not find incident with desired id";
    }
    let updated_incident = {
        category: incident.category,
        postedDate: incident.postedDate,
        Title: incident.Title,
        description: incident.description,
        location: incident.location,
        reportedBy: incident.reportedBy,
        userId: incident.userId,
        verified: incident.verified,
        status: status,
        likes: incident.likes || 0,
        notifications: incident.notifications,
        comments: incident.comments
    };
    await incident_collection.updateOne({_id: new ObjectId(id)}, {$set: updated_incident});
    let updated = await incident_collection.findOne({_id: new ObjectId(id)});
    if (!updated){
        throw "Error: status could not be updated";
    }
    let message = "Status has been updated!";
    return message;

}

const removeIncident = async(
    id,
    verified
) => {
    //id error checks
    id = id_checker(id);

    // Allow deletion if incident has not been verified (empty string or "no")
    if (verified !== "" && verified !== "no"){
        throw "Error: cannot delete a verified incident";
    }

    //remove the incident
    const incident_collection = await incidents();
    const removed_incident = await incident_collection.findOneAndDelete({_id: new ObjectId(id)});
    if (!removed_incident){
        throw "Error: could not remove incident";
    }
    let message = "incident successfully removed!";
    return message;
}

const updateIncident = async(
    incident_id,
    user_id,
    category,
    Title,
    description,
    location
) => {
    //id error checks
    incident_id = id_checker(incident_id);

    //grab original incident from collection
    const incident_collection = await incidents();
    let og_incident = await incident_collection.findOne({_id: new ObjectId(incident_id)});
    if (!og_incident){
        throw "Error: could not retrieve original incident";
    }

    //check user_id before allowing for an update
    if (user_id !== og_incident.userId){
        throw "Error: cannot update an incident that you didn't post";
    }

    //Build og object before checking updated incident
    let new_incident = {
        category: og_incident.category,
        postedDate: og_incident.postedDate,
        Title: og_incident.Title,
        description: og_incident.description,
        location: og_incident.location,
        reportedBy: og_incident.reportedBy,
        userId: og_incident.userId,
        verified: og_incident.verified,
        status: og_incident.status,
        likes: og_incident.likes || 0,
        notifications: og_incident.notifications,
        comments: og_incident.comments
    };

    //Fill new incident with all updated fields
    if (category !== ""){
        category = string_checker(category);
        if (category.length > 100){
            throw "Error: updated category cannot be longer than 100 characters";
        }
        new_incident.category = category
    }
    if (Title !== ""){
        Title = string_checker(Title);
        if (Title.length > 100){
            throw "Error: updated title cannot be longer than 100 characters";
        }
        new_incident.Title = Title;
    }
    if (description !== ""){
        description = string_checker(description);
        if (description.length > 500){
            throw "Error: updated description cannot be longer than 500 characters";
        }
        new_incident.description = description;
    }
    if (location !== ""){
        location = string_checker(location);
        if (location.length > 100){
            throw "Error: updated location cannot be longer than 100 characters";
        }
        new_incident.location = location;
    }
    await incident_collection.findOneAndUpdate({_id: new ObjectId(incident_id)}, {$set: new_incident}, {returnDocument: "after"});
    let updated_incident = await incident_collection.findOne({_id: new ObjectId(incident_id)});
    if (!updated_incident){
        throw "Error: could not properly update incident";
    }
    let message = "Incident has been updated!";
    return message;

}

const createNotif = async(
    name,
    content,
    incident_id,
    user_id
) => {
    //pull name from user db and error check
    name = string_checker(name);

    //error check content
    content = string_checker(content);
    if (content.length > 500){
        throw "Error: content cannot be longer than 500 characters"
    }

    //error check incident_id
    incident_id = id_checker(incident_id);

    //error check user_id
    user_id = id_checker(user_id);

    //Build object
    let notif = {
        name: name,
        content: content,
        incident_id: incident_id,
        user_id: user_id
    };
    const notif_collection = await notifications();
    const insert_notif = await notif_collection.insertOne(notif);
    if (!insert_notif.acknowledged || !insert_notif.insertedId){
        throw "Error: could not add notif";
    }

    //Update incident notif subdocument
    const incident_collection = await incidents();
    let update_incident = await incident_collection.updateOne({_id: new ObjectId(incident_id)}, {
        $push: {notifications: notif},
    });
    update_incident = await incident_collection.findOne({_id: new ObjectId(incident_id)});
    if (!update_incident){
        throw "Error: failed to update incident";
    }
    //grab user collection to send emails:
     try{
        let user_collection = await users();
        let emailed_users = await user_collection.find({location: update_incident.location}).toArray();
        let emailed_users_length = emailed_users.length;
        for(let i = 0; i < emailed_users_length; i++){
            let user_location = emailed_users[i].location;
            if (user_location === update_incident.location){
                let email = emailed_users[i].email;
                const mailOptions = {
                    from: 'sentryCS546@gmail.com',
                    to: email,
                    subject: 'New Incident Reported in your area!',
                    text: 'Hello, a new incident has been created in your area. Ig attach incident_id here idk can edit message later'
                };
                await transporter.sendMail(mailOptions); 
                console.log("Email sent!");
            }
        }
    } catch(e){
        console.log("Email failed:", e);
    }
    let message = "Successfully created notification!";
    return message;
}

const removeNotif = async(id) => {
    //id error checks
    id = id_checker(id);

    //remove the notification
    const notif_collection = await notifications();
    const removed_notif = await notif_collection.findOneAndDelete({_id: new ObjectId(id)});
    if (!removed_notif){
        throw "Error: notif was unsuccessfully removed";
    }

    //update incident notif subdocument
    const all_remaining_notifs = await notif_collection.find({incident_id: removed_notif.incident_id}).toArray();
    const incident_collection = await incidents();
    let updated_incident = await incident_collection.findOneAndUpdate({_id: removed_notif.incident_id}, {$set: {notifications: all_remaining_notifs}});
    if (!updated_incident){
        throw "Error: could not update incident";
    }
    let message = "Notification successfully deleted!";
    return message;
}

const updateNotif = async(
    id,
    content
) => {
    //id error checks
    id = id_checker(id);

    //error check the content
    content = string_checker(content);
    if (content.length > 500){
        throw "Error: updated content cannot be longer than 500 characters";
    }

    //update the notification
    const notif_collection = await notifications();
    const updated_notif = await notif_collection.findOneAndUpdate({_id: new ObjectId(id)}, {$set: {content: content}});
    if (!updated_notif){
        throw "Error: could not update notif";
    }

    //update the incident notif subdocument
    const all_remaining_notifs = await notif_collection.find({incident_id: updated_notif.incident_id}).toArray();
    const incident_collection = await incidents();
    let updated_incident = await incident_collection.findOneAndUpdate({_id: updated_notif.incident_id}, {$set: {notifications: all_remaining_notifs}});
    if (!updated_incident){
        throw "Error: could not update incident";
    }
    let message = "Notification successfully updated!";
    return message;

}



const createComment = async(
    name,
    content,
    incident_id,
    user_id
) => {
    //pull name from user db
    name = string_checker(name);

    //error check content
    content = string_checker(content);
    if (content.length > 500){
        throw "Error: content cannot be longer than 500 characters"
    }

    //incident_id error checks
    incident_id = id_checker(incident_id);

    //user_id error checks
    user_id = id_checker(user_id);

    //Build object
    let comment = {
        name: name,
        content: content,
        incident_id: incident_id,
        user_id: user_id
    };
    const comment_collection = await comments();
    const insert_comment = await comment_collection.insertOne(comment);
    if (!insert_comment.acknowledged || !insert_comment.insertedId){
        throw "Error: could not add comment";
    }

    //Update incident comment subdocument
    const incident_collection = await incidents();
    let update_incident = await incident_collection.updateOne({_id: new ObjectId(incident_id)}, {
        $push: {comments: comment},
    });
    update_incident = await incident_collection.findOne({_id: new ObjectId(incident_id)});
    if (!update_incident){
        throw "Error: failed to update incident";
    }
    let message = "Successfully created comment!";
    return message;

}

const removeComment = async(id) => {
    //id error checks
    id = id_checker(id);

    //remove the notification
    const comment_collection = await comments();
    const removed_comment = await comment_collection.findOneAndDelete({_id: new ObjectId(id)});
    if (!removed_comment){
        throw "Error: comment was unsuccessfully removed";
    }

    //update incident notif subdocument
    const all_remaining_comments = await comment_collection.find({incident_id: removed_comment.incident_id}).toArray();
    const incident_collection = await incidents();
    let updated_incident = await incident_collection.findOneAndUpdate({_id: removed_comment.incident_id}, {$set: {comments: all_remaining_comments}});
    if (!updated_incident){
        throw "Error: could not update incident";
    }
    let message = "Comment successfully deleted!";
    return message;
}

const updateComment = async(
    id,
    content
) => {
    //id error checks
    id = id_checker(id);

    //error check the content
    content = string_checker(content);
    if (content.length > 500){
        throw "Error: updated content cannot be longer than 500 characters";
    }

    //update the notification
    const comment_collection = await comments();
    const updated_comment = await comment_collection.findOneAndUpdate({_id: new ObjectId(id)}, {$set: {content: content}});
    if (!updated_comment){
        throw "Error: could not update comment";
    }

    //update the incident notif subdocument
    const all_remaining_comments = await comment_collection.find({incident_id: updated_comment.incident_id}).toArray();
    const incident_collection = await incidents();
    let updated_incident = await incident_collection.findOneAndUpdate({_id: updated_comment.incident_id}, {$set: {comments: all_remaining_comments}});
    if (!updated_incident){
        throw "Error: could not update incident";
    }
    let message = "Comment successfully updated!";
    return message;

}

const add_like = async(id, user_id) => {
    id = id_checker(id);
    user_id = id_checker(user_id);

    let incident_collection = await incidents();
    const incident = await incident_collection.findOne({_id: new ObjectId(id)});
    if (!incident) throw "Error: could not find incident with desired id";

    const likedBy = incident.likedBy || [];
    if (likedBy.includes(user_id)) throw "Error: you have already liked this incident";

    let new_likes = (incident.likes || 0) + 1;
    await incident_collection.updateOne({_id: new ObjectId(id)}, {
        $set: {likes: new_likes},
        $push: {likedBy: user_id}
    });
    return new_likes;
}

export{
    createIncident,
    getAllIncidents,
    getOneIncident,
    removeIncident,
    updateIncident,
    verifyIncident,
    updateStatus,
    add_like,
    createNotif,
    removeNotif,
    updateNotif,
    createComment,
    removeComment,
    updateComment
}

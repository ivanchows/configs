import {Router} from 'express';
const router = Router();
import {
    createIncident,
    getAllIncidents,
    getOneIncident,
    removeIncident,
    updateIncident,
    verifyIncident,
    updateStatus,
    add_like,
    createComment
} from '../data/incidentfunctions.js';

import {
  string_checker,
  id_checker
} from '../data/errorchecking.js';

function requireLogin(req, res, next) {
    if (!req.session.user) return res.redirect('/signin');
    next();
}

// List all incidents
router
    .route('/incidents')
    .get(async (req, res) => {
        try{
            let incidents = await getAllIncidents();
            incidents = incidents.map((incident) => {
                incident._id = incident._id.toString();
                return incident;
            });
            return res.render('incidents', {title: 'All Incidents', incidents: incidents});
        } catch(e){
            return res.status(500).render('error', {title: 'error', error: e, error_class: 'error'});
        }
    });
router
    .route('/incident_create')
    .get(requireLogin, async (req, res) =>{
        try{
            return res.render('incident_create', {title: "Create Incident"});
        } catch(e){
            return res.status(404).render('error', {title: "error", error: e});
        }
    })
    .post(requireLogin, async (req, res) => {
        let incident_data = req.body;
        if (!incident_data){
            return res.status(400).render('error', {title: "error", error: "No data submitted"});
        }
        try{
            incident_data.category = string_checker(incident_data.category);
            if (incident_data.category.length > 100){
                throw "Error: category cannot be longer than 100 characters";
            }
            incident_data.Title = string_checker(incident_data.Title);
            if (incident_data.Title.length > 100){
                throw "Error: title cannot be longer than 100 characters";
            }
            incident_data.description = string_checker(incident_data.description);
            if (incident_data.description.length > 500){
                throw "Error: description cannot be longer than 500 characters";
            }
            incident_data.location = string_checker(incident_data.location);
            if (incident_data.location.length > 100){
                throw "Error: location cannot be longer than 100 characters";
            }
            //get reportedBy and user_id from session
        } catch(e){
            return res.status(400).render('error', {title: "error", error: e});
        }
        try{
            const {category, Title, description, location} = incident_data;
            const reportedBy = req.session.user.firstName + " " + req.session.user.lastName;
            const user_id = req.session.user._id.toString();
            await createIncident(category, Title, description, location, reportedBy, user_id);
            return res.redirect('/incidents');
        } catch(e){
            return res.status(400).render('error', {title: "error", error: e});
        }
    });

router
    .route('/incident_card/:id')
    .get(requireLogin, async (req, res) => {
        let incident_data = req.body;
        if (!incident_data){
            return res.status(400).render('error', {title: "error", error: e, error_class: "error"});
        }
        try{
            req.params.id = id_checker(req.params.id);
            incident_data.category = string_checker(cleanInput(incident_data.category));
            if (incident_data.category.length > 100){
                throw "Error: category cannot be longer than 100 characters";
            }
            let image = "../images/default.jpg";
            if(incident_data.category.toLocaleLowerCase() === "traffic"){
                image = "../images/traffic.jpg";
            }
            if(incident_data.category.toLocaleLowerCase() === "theft"){
                image = "../images/theft.jpg";
            }
            if(incident_data.category.toLocaleLowerCase() === "animal"){
                image = "../images/animal.jpg";
            }
            if(incident_data.category.toLocaleLowerCase() === "crime"){
                image = "../images/crime.jpg";
            }
            if(incident_data.category.toLocaleLowerCase() === "car accident"){
                image = "../images/car accident.jpg";
            }
            if(incident_data.category.toLocaleLowerCase() === "suspicious activity"){
                image = "../images/suspicious activity.jpg";
            }
            if(incident_data.category.toLocaleLowerCase() === "debris"){
                image = "../images/debris.jpg";
            }
            incident_data.Title = string_checker(cleanInput(incident_data.Title));
            if (incident_data.Title.length > 100){
                throw "Error: title cannot be longer than 100 characters";
            }
            incident_data.description = string_checker(cleanInput(incident_data.description));
            if (incident_data.description.length > 500){
                throw "Error: description cannot be longer than 500 characters";
            }
            incident_data.location = string_checker(cleanInput(incident_data.location));
            if (incident_data.location.length > 100){
                throw "Error: location cannot be longer than 100 characters";
            }
        } catch(e){
            return res.status(400).render('error', {title: "error", error: e});
        }
        try{
            //get user_id and perform check from whats in the db
            let correct_user = false;
            let admin = false;
            const incident = await getOneIncident(req.params.id);
            if (req.session.user._id.toString() === incident.userId){
                correct_user = true;
            }
            //get user role, if admin set admin = true
            if (req.session.user.role === "admin") {
                admin = true;
            }
            const hasLiked = (incident.likedBy || []).includes(req.session.user._id.toString());
            return res.render('incident_card', {title: "Incident Card", incident: incident, admin: admin, user: correct_user, hasLiked: hasLiked, image: image});
        } catch(e){
            return res.status(404).render('error', {title: "error", error: e});
        }
    })
    .post(requireLogin, async (req, res) =>{
        try{
            req.params.id = id_checker(req.params.id);
        } catch(e){
            return res.status(400).render('error', {title: "error", error: e});
        }
        try{
            const incident = await getOneIncident(req.params.id);
            const verified = incident.verified;
            await removeIncident(req.params.id, verified);
            return res.render('Deletion', {title: "Deleted"});
        } catch(e){
             return res.status(404).render('error', {title: "error", error: e});
        }
    });

router
    .route('/incident_update/:id')
    .get(requireLogin, async (req, res) => {
        try{
            req.params.id = id_checker(req.params.id);
            const incident = await getOneIncident(req.params.id);
            return res.render('incident_update', {title: "Update Incident", incident: incident});
        } catch(e){
            return res.status(404).render('error', {title: "error", error: e});
        }
    })
    .post(requireLogin, async (req, res) => {
        let incident_data = req.body;
        if (!incident_data){
            return res.status(400).render('error', {title: "error", error: "No data submitted"});
        }
        try{
            req.params.id = id_checker(req.params.id);
            if (incident_data.category) {
                incident_data.category = string_checker(incident_data.category);
                if (incident_data.category.length > 100){
                    throw "Error: category cannot be longer than 100 characters";
                }
            }
            if (incident_data.Title) {
                incident_data.Title = string_checker(incident_data.Title);
                if (incident_data.Title.length > 100){
                    throw "Error: title cannot be longer than 100 characters";
                }
            }
            if (incident_data.description) {
                incident_data.description = string_checker(incident_data.description);
                if (incident_data.description.length > 500){
                    throw "Error: description cannot be longer than 500 characters";
                }
            }
            if (incident_data.location) {
                incident_data.location = string_checker(incident_data.location);
                if (incident_data.location.length > 100){
                    throw "Error: location cannot be longer than 100 characters";
                }
            }
        } catch(e){
            return res.status(400).render('error', {title: "error", error: e});
        }
        try{
            const {category, Title, description, location} = incident_data;
            const user_id = req.session.user._id.toString();
            await updateIncident(req.params.id, user_id, category || "", Title || "", description || "", location || "");
            return res.redirect('/incident_card/' + req.params.id);
        } catch(e){
            return res.status(400).render('error', {title: "error", error: e});
        }
    });

router
    .route('/verify/:id')
    .get(requireLogin, async (req, res) =>{
        try{
            const incident = await getOneIncident(req.params.id);
            return res.render('Verify', {title: "Verify Incident", incident: incident});
        } catch(e){
            return res.status(404).render('error', {title: "error", error: e});
        }
    })
    .post(requireLogin, async (req, res) => {
        try{
            req.params.id = id_checker(req.params.id);
            const user_role = req.session.user.role;
            const verify = req.body.verified;
            await verifyIncident(req.params.id, verify, user_role);
            return res.redirect('/incident_card/' + req.params.id);
        } catch(e){
            return res.status(400).render('error', {title: "error", error: e});
        }
    });

router
    .route('/status_update/:id')
    .get(requireLogin, async (req, res) =>{
        try{
            const incident = await getOneIncident(req.params.id);
            return res.render('Status_Update', {title: "Update Status", incident: incident});
        } catch(e){
            return res.status(404).render('error', {title: "error", error: e});
        }
    })
    .post(requireLogin, async (req, res) => {
        try{
            req.params.id = id_checker(req.params.id);
            const user_role = req.session.user.role;
            const user_id = req.session.user._id.toString();
            const status = req.body.status;
            await updateStatus(req.params.id, status, user_role, user_id);
            return res.redirect('/incident_card/' + req.params.id);
        } catch(e){
            return res.status(400).render('error', {title: "error", error: e});
        }
    });

router
    .route('/comment/:id')
    .post(requireLogin, async (req, res) =>{
        let content = req.body.content;
        if (!content){
            return res.status(400).render('error', {title: "error", error: "No content supplied"});
        }
        try{
            content = string_checker(content);
            if (content.length > 500){
                throw "Error: content cannot be longer than 500 characters";
            }
            req.params.id = id_checker(req.params.id);
        } catch(e){
            return res.status(400).render('error', {title: "error", error: e});
        }
        try{
            const incident = await getOneIncident(req.params.id);
            let incident_id = incident._id.toString();
            let name = req.session.user.firstName + " " + req.session.user.lastName;
            let user_id = req.session.user._id.toString();
            await createComment(name, content, incident_id, user_id);
            return res.redirect('/incident_card/' + req.params.id);
        } catch(e){
             return res.status(404).render('error', {title: "error", error: e});
        }
    });

router
    .route('/like/:id')
    .post(requireLogin, async (req, res) => {
        try {
            req.params.id = id_checker(req.params.id);
            const user_id = req.session.user._id.toString();
            await add_like(req.params.id, user_id);
            return res.redirect('/incident_card/' + req.params.id);
        } catch(e) {
            return res.status(400).render('error', {title: "error", error: e});
        }
    });

export default router;

var express = require('express'),
	router = express.Router(),
	knex = require('../db/knex.js');

require('dotenv').load();

router.get('/', function(req, res, next) {
	res.locals.user = req.user || "";
	res.cookie('vote','true');
	res.cookie('user', (new Date()).toString());
	knex('categories').where({featured: true})
	.then(function(result) {
		var category = result[0].name;
		res.render('index', { title: 'nearmeow', categoryName: category, gmapsBrowserKey: process.env.GMAPS_BROWSER_KEY, user: process.env.ACCESS_TOKEN});
	});
});

router.get('/about', function(req, res) {
	res.render('about');
})

router.get('/category', function(req, res) {
	res.render('category');
});

router.post('/category/new', function(req, res) {
	var category = req.body.newCategory;
	
	knex('categories').where({name:category})
	.then(function(result) {
		console.log(result);
		if (result.length > 0) {
			res.redirect('/');
		} else {
			knex('categories').insert({name:category, featured: false})
			.then(function(){
				res.redirect('/');
			});
		}
	});

});

router.post('/category/today', function(req, res) {
	var category = req.body.todaysCategory;
	
	knex('categories').where({featured: true})
	.then(function(result) {
		if (result.length > 0) {
			var selection = result[0].id;
			setFeaturedCategory(category, selection, res);
		} else {
			setFeaturedTrue(category, res);
		}
	});

});

function setFeaturedCategory (category, selection, res) {
	knex('categories').where({id: selection}).update({featured: false})
	.then(function(){
		setFeaturedTrue(category, res);
	});
};

function setFeaturedTrue (category, res) {
	knex('categories').where({name:category}).update({featured: true})
	.then(function(){
		res.redirect('/');
	});
};

router.post('/vote', function(req, res, next) {
	var data = JSON.parse(req.body.data),
		gPlaceId = data.place_id,
		gPlaceName = data.name,
		gPlaceLat = data.geometry.location.lat,
		gPlaceLng = data.geometry.location.lng,
		user = req.cookies.user;

	knex('users').insert({user_name: user, password: '!!!pass$%#'}).returning('')
	.then(function(thisData){

		knex('users').where({user_name: user})
		.then(function(result) {
			var currentUser = result[0].id;
			
			knex('places').where({google_place_id: gPlaceId})
			.then(function(result) {
				
				if (result.length > 0) {
					addVote(gPlaceId, currentUser)
				} else {
					addPlaceAndVote(gPlaceName, gPlaceId, gPlaceLat, gPlaceLng, currentUser);
				}

				knex('votes').join('places', 'votes.place_id', '=', 'places.id')
				.select('latitude', 'longitude', 'google_place_id').then(function(votes) {
					var votedOnPlaces = [];
					
					votes.forEach(function(vote) {
						votedOnPlaces.push({lat: Number(vote.latitude), lng: Number(vote.longitude), gPlaceId: vote.google_place_id});
					});

					res.send(votedOnPlaces);
				});	

			});

		}).catch(function(err){
			console.log('error', err.stack);
		});	
	});

});

function addPlaceAndVote(gPlaceName, gPlaceId, lat, lng, currentUser) {
	knex('places').insert({name:gPlaceName, google_place_id:gPlaceId, latitude:lat, longitude:lng})
	.then(function(){
		addVote(gPlaceId, currentUser);
	});
}

function addVote(gPlaceId, currentUser) {
	knex('places').where({google_place_id: gPlaceId})
	.then(function(result) {
		var currentPlace = result[0].id;
		knex('votes').insert({place_id: currentPlace, user_id: currentUser , date: new Date()})
		.then(function(){});
	});
}

module.exports = router;
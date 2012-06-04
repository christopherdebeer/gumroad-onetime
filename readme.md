#Gumroad-Onetime

This node package makes handling one-time gumroad urls for managing payments as simple as possible. Uses Redis to store session data and urls, and the gumroad API wrapper to comminicate with cumroad (maing urls and removing them once used).


##Install

`npm install gumroad-onetime`

##Usage

Setup your client:

	var gr = require('gumroad-onetime');

	gr.setup({
		// gumroad username/email
		username: "<username/email>",
		
		// gumroad password
		password: "<password>",
		
		// url for handling purchases
		path: "/buy",

		// when a user returns from paying, this function will be called 
		// and passed the session data you asked to store, or an error if applicable.
		onPurchase: function(err, req, res, data){
			console.log("Error: ", err);
			console.log("Session Data: ", data);
		}
	});

###Middleware

Middleware follows the connect style `function(req, res, next){}` so can either be added to a standard http server, where the middleware will check if it needs to handle the request and if not, passesit to the rest of your app/routes.

	http.createServer(function (req, res) {
		gr.middleware(req, res, function(req, res){
			// other routes
			// the rest of your app
			// etc
		});
		
	}).listen(80);

The middleware also allows you to add it seemlessly to `Express` or `Connect` apps, and any other frameworks that follow the same pattern.

	var express = require('express');
	var app = express.createServer();

	app.configure(function(){
	    app.use(express.methodOverride());
	    app.use(express.bodyParser());

	    app.use(gr.middleware); // Insert Gumroad-onetime middleware:

	    app.use(app.router);
	});

	app.get('/', function(req, res){
	  res.send('Hello World');
	});

	app.listen(3000);


###Purchases

At any point you can send a user through the purchase process, by passing the request and response objects, the link info for your purchase as well as any session data you want to keep, like so:
	
	var userData = {user: "data", that: ["you'd", "like", "to", "store"], awesome: true};

	var link = {
		name: "Awesome thing to buy",
		price: 9001,
		desc: "A nice informative description for the purchase"
	}

	gr.purchase(req, res, userData, link, function(err, data) {
		if (err) {
			console.log("Error completing purchase.")
		} else {
			res.writeHead(500, {'Content-Type': 'text/html'});
			res.end('Purchase successful.');
		}
	});








	
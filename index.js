var gr 		= require('gumroad'),
	http 	= require('http'),
	redis 	= require('redis'),
	url 	= require('url'),
	qs 		= require('qs'),
	_ 		= require('underscore'),
	uuid 	= require('node-uuid'),
	rClient = redis.createClient();

var config = {
	port: 1337,
	ip: "127.0.0.1",
	prefix: "gr_1t_",
	options: {
		username: "xxxx",
		password: "xxxx",
		path: "/grBuy",
		onPurchase: function(err, req, res, data) {
			if (!err) {
				if (onetime.debug) console.log("gmLink activated. data from redis was: ", data);
				res.writeHead(200, {'Content-Type': 'text/plain'});
				res.end('Thank you for your purchase.\nsession data:\n' + JSON.stringify(data));
			} else {
				res.writeHead(500, {'Content-Type': 'text/plain'});
				res.end('Error.')
			}
		}
	}
}

var onetime = {

	debug: true,

	demo: function(){

		http.createServer(function (req, res) {
			onetime.middleware(req, res, function(req, res){
				if (url.parse(req.url).pathname === '/buyCredits') {
					onetime.purchase(req, res, {test: "meeee", sessionData: "from redis", win: true},{name: "test", price: 1, desc: "about the purchase"}, function(err, data) {
						if (err) {
							res.writeHead(500, {'Content-Type': 'text/html'});
							res.end('error forwarding user to gumroad');
						}
						if (onetime.debug)console.log("redirected user to gumroad.");
					});
				} else {
					res.writeHead(200, {'Content-Type': 'text/html'});
					res.end('<a href="/buyCredits">Click to buy credits</a>');
				}
			})
			
		}).listen(config.port, config.ip);

		onetime.createClient();
	},  
	getMiddleware: function(){
		return onetime.middleware;
	},
	middleware: function(req, res, next){

		
		var path = url.parse(req.url).pathname,
			query = qs.parse(url.parse(req.url).query);

		if (path === config.options.path && typeof query.token !== 'undefined') {

			var token = query.token;
			if (onetime.debug) console.log("onetime activated for: ", path, query);
			rClient.get(config.prefix + token, function(err, result) {
				if (err || !result || result === "used") next(req,res);
				else {
					var data = JSON.parse(result);
					if (onetime.debug) console.log("token was valid and in redis, ", data)
					onetime.client.deleteLink(data.id, function(){
						if (!err) rClient.set(config.prefix + token, "used");
					})
					if (onetime.debug) console.log("session data from redis: ", data.session)
					config.options.onPurchase(req, res, data.session);
				}
			});
			

		} else {
			if (onetime.debug) console.log("no onetime passing to next()");
			next();

		}
		
	},
	createClient: function(options, cb){

		if (typeof cb !== 'function') cb = function(){};

		if (onetime.debug) config.options = _.defaults(config.options, options);

		var client = new gr(config.options.username, config.options.password);
		client.authenticate(function(err) {
			if (err) cb(err, null);
			else {
				onetime.client = client;
				cb(null);
			}
		});


	},
	purchase: function(req, res, sessionData, link, cb) { 

		var token = uuid.v4();
		var baseUrl = url.parse(req.url);

		var link = {
			name: link.name || token,
			url: baseUrl.protocol + "//" + baseUrl.host + config.options.path + "?token=" + token,
			price: link.price || 0,
			description: link.desc || ""
		};

		onetime.client.newLink(link, function(err, ret){
			if (err) cb(err, null)
			else {
				cb(null, ret);
				var data = JSON.stringify({
					id: ret.id, 
					session: sessionData
				});
				rClient.set(config.prefix + token, data);
				res.writeHead(302, {'Location': ret.short_url});
				res.end();
			}
		})

	},
	deleteLink: function(id, cb) {
		onetime.client.deleteLink(id, function(err, res){
			if (err) cb(err, null)
			else {
				cb(null, res);
			}
		})
	}
}


if (module.parent) {
	onetime.debug = false;
	module.exports = {
		setup: onetime.createClient,
		purchase: onetime.purchase,
		middleware: onetime.middleware,
		getMiddleware: onetime.getMiddleware,
	};
} else {
	if (onetime.debug) console.log('Creating standalone onetime server...')
	onetime.demo();
}
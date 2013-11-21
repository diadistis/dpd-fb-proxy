var accessToken = null;

var 
    Resource = require('deployd/lib/resource'), 
    querystring = require('querystring'),
    util = require('util'),
	https = require('https'),
	Q = require('q'),
    url = require('url');

function FBProxy(name, options) {
    Resource.apply(this, arguments);
}
util.inherits(FBProxy, Resource);
module.exports = FBProxy;

FBProxy.prototype.clientGeneration = true;

FBProxy.prototype.getAccessToken = function(ctx){
	var deferred = Q.defer();
	
    if(accessToken) {
		deferred.resolve(null);
	} else {
		var accessTokenRequest = {
            hostname: 'graph.facebook.com',
            pathname: 'oauth/access_token',
            protocol: 'https:',
            query: {
                client_id: this.config.applicationId,
                client_secret: this.config.applicationSecret,
                grant_type: 'client_credentials'
            }
        };
		var auth_request = https.get(url.format(accessTokenRequest), deferred.resolve);        
		auth_request.on('error', function(e) {
		  ctx.res.end("Error retrieving authentication token.");
		});
	}    
	return deferred.promise;
};

FBProxy.prototype.handle = function (ctx, next){
    if(ctx.req && ctx.req.method !== 'GET') return next();
    
    this.getAccessToken().then(function(rs){
        if(rs){
            rs.setEncoding('utf8');
            rs.on('data', function (chunk) {
                accessToken = chunk;
            });
        }
        
        if(!accessToken) 
            ctx.res.end("No Access Token");
        
        var urlObj = url.parse(ctx.url);    
        urlObj.query = ctx.query;
        
        var paramsObj = querystring.parse(accessToken);
        
        for (var property in paramsObj)
            urlObj.query[property] = paramsObj[property];

        urlObj = url.parse(url.format(urlObj));
        
        var requestOptions = {
            hostname : 'graph.facebook.com',
            path : urlObj.path
        };
        
        var proxy_request = https.get(requestOptions, function(res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                ctx.res.write(chunk);
            });
            res.on('end', function (chunk) {
                ctx.res.end();
            });
        }).on('error', function(e) {
          accessToken = null;
          ctx.res.end();
        });
    });
};

FBProxy.basicDashboard = {
  settings: [
  {
    name        : 'applicationId',
    type        : 'text',
    description : 'Facebook Application ID'
  }, {
    name        : 'applicationSecret',
    type        : 'text',
    description : 'Facebook Application Secret'
  }]
};


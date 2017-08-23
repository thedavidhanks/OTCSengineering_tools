firebase.auth().onAuthStateChanged(function(user) {
    if(user && user.emailVerified){
        var email = user.email;
        console.log(email + ' logged in');
        $('#logout').removeClass('hidden');
    }else if (user && !user.emailVerified){
        //TODO: Give the user the option to resend their email.
        
        alert('Please validate your email by visiting the link in your email.');
    }
    else{
        //kick the user to the login page
        window.location.replace("login.html");
        console.log('not logged in.  Redirect');
        $('#logout').addClass('hidden');
    }
});

/*TODO: 

* prepopulate Contact info
* Send data to firebase database 
* Clean up BOP stack format
* add review info field
* show diagram of riser gap, HPU elevation, Subsea depth
* add units
* 
* Allow user to upload multiple files http://www.alpacajs.org/docs/fields/upload.html and https://github.com/blueimp/jQuery-File-Upload/wiki
* Allow user to delegate section.
* Allow user to request shear or accumulator calcs
* Allow user to load previous form.
* 
*/  
 $(document).ready(function() {
	 firebase.auth().onAuthStateChanged(function(user) {
	    if(user && user.emailVerified){
	    	var email = user.email;
	    	var emailVerified = user.emailVerified;
	    	const formdata = {
		        name: "Logged In",
		        email: email,
		        email2: email
		    };
		    if (user !== null) {
		      $('#left-margin').text("hello");
		    }
		    else{
		    	$('#right-margin').text("hello2");
		    }			        
	        console.log(email + ' sent to formdata object');
	        
	    }
	    else{
	    	var formdata = {
		        name: "Some Guy"
		    };
		};
	});   
    
    
 
    $('#logout').click(function() {
        firebase.auth().signOut();
    });
	
	
	//TODO: error - Why isn't the formdata defintion carried over from above?
	var formdata = {
	    name: "Some Guy"
	};
    $("#form_info").alpaca({
        "optionsSource": "./cids_options1.json",
        "schemaSource": "./cids_schema1.json",
        //"dataSource": "./cids_data1.json",
        "data":  formdata,
        "options":{
            "fields": {
                "email2":{
                    "validator": function(callback) {
                        var value2 = this.getValue();
                        var value1 = this.getParent().childrenByPropertyId["email"].getValue();
                        if (value2 == value1){
                            callback({
                                "status": true,
                                "message": "Words match"
                            });
                        } else{
                            callback({
                                "status": false,
                                "message": "Emails do not match"
                            });
                        }
                    }
                }
            },
            "form": {
                "buttons": {
                    "submit": {
                        "title": "Show Results",
                        "click": function() {
                            alert(JSON.stringify(this.getValue()));
                        }
                    }
                }
            }
        },
        "view": {
            "parent": "bootstrap-edit-horizontal",
            "wizard": {
                "title":"Welcome to the Wizard",
                "description": "Fill it out",
                "bindings": {
                    "name": 1,
                    "company": 1,
                    "phone": 1,
                    "email": 1,
                    "email2": 1,
                    "rigName": 2,
                    "rigOwner": 2,
                    "bopLocation": 2,
                    "heightRiser": 2,
                    "heightHPU": 2,
                    "BOP_Stack": 3,
                    "wellName": 4,
                    "wellLocation": 4,
                    "MAWHP": 4,
                    "MASP": 4,
                    "depth": 4,
                    "mudWeight": 4,
                    "tubulars": 5,
                    "comments": 6,
                    "files": 6,
                    "review": 7                             
                },
                "steps": [{
                    "title": "Operator",
                    "description": "Contact information"
                }, {
                    "title": "Rig Info"
                }, {
                    "title": "BOP",
                    "description": "Stack Configuation"
                }, {
                    "title": "Well Parameters"
                }, {
                    "title": "Tubulars"
                }, {
                    "title": "Comments"
                }, {
                    "title": "Submit"
                }]
            }
        }
    });
});
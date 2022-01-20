// import dependencies you will use
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const session = require('express-session');

// set up expess validator
const {check, validationResult} = require('express-validator'); //destructuring an object
  
// set up DB connection and connect to DB
mongoose.connect('mongodb://localhost:27017/artblog',{
    useNewUrlParser: true,
    useUnifiedTopology: true
})

// define the collection(s)
const Post = mongoose.model('Post',{
    description: String,
    imageName: String,
    blogTitle : String
});

// set up the model for admin
const Admin = mongoose.model('Admin', {
    username: String,
    password: String
});

// set up variables to use packages
var myApp = express();
myApp.use(express.urlencoded({extended:false})); 

// set path to public folders and view folders
myApp.set('views', path.join(__dirname, 'views'));
//use public folder for CSS etc.
myApp.use(express.static(__dirname+'/public'));
myApp.set('view engine', 'ejs');
myApp.use(fileUpload());

// set up session
myApp.use(session({
    secret: 'superrandomsecret',
    resave: false,
    saveUninitialized: true
}));

// set up different routes (pages) of the website
// render the home page
myApp.get('/',function(req, res){
    Post.find({}).exec(function(err, posts){ // fetch all the cards
        res.render('home', {posts:posts}); //pass all cards to home for creating top menu
    });
});

myApp.get('/home',function(req, res){
    Post.find({}).exec(function(err, posts){ 
        res.render('home', {posts:posts}); 
    });
});

myApp.get('/post',function(req, res){
    Post.find({}).exec(function(err, posts){ 
        res.render('post', {posts : posts}); 
    });
});

myApp.get('/allposts',function(req, res){
    if(req.session.userLoggedIn){  // check if the user is logged in
        Post.find({}).exec(function(err, posts){ // fetch all the posts
            res.render('allposts', {posts:posts}); //pass all posts to home for creating top menu
        });
    }
    else{ // otherwise send the user to the login page
        res.redirect('/login');
    }
});

myApp.get('/add',function(req, res){
    if(req.session.userLoggedIn){ // check if the user is logged in
        Post.find({}).exec(function(err, posts){ // fetch all the posts
            res.render('add', {posts:posts}); //pass all posts to home for creating top menu
        });
    }
    else{ // otherwise send the user to the login page
        res.redirect('/login');
    }
});

myApp.get('/login',function(req, res){
    Post.find({}).exec(function(err, posts){ // fetch all the posts
        res.render('login', {posts:posts}); //pass all posts to home for creating top menu
    });
});

// login form post
myApp.post('/login', function(req, res){
    var user = req.body.username;
    var pass = req.body.password;
    console.log(user);
    console.log(pass);

    Admin.findOne({username: user, password: pass}).exec(function(err, admin){
        // log any errors
        console.log('Error: ' + err);
        console.log('Admin: ' + admin);
        if(admin){
            //store username in session and set logged in true
            req.session.username = admin.username;
            req.session.userLoggedIn = true;
            // redirect to the dashboard
            res.redirect('/allposts');
        }
        else{
            res.render('login', {error: 'Sorry, cannot login!'});
        }
    });  
});

myApp.get('/logout', function(req, res){
    req.session.username = '';
    req.session.userLoggedIn = false;
    res.render('login', {error: 'Successfully logged out'});
});

//processing an add new post
myApp.post('/process',[
    check('description', '*Please enter a description.').not().isEmpty(),
    check('blogTitle', '*Please insert a blog title').not().isEmpty(),
], function(req,res){
    Post.find({}).exec(function(err, posts){ // fetch all the posts
    // check for errors
    const errors = validationResult(req);
    console.log(errors);
    if(!errors.isEmpty())
    {
        res.render('add',{er: errors.array()});
    }
    else
    {
        //fetch all the form fields
        var description = req.body.description;
        var blogTitle = req.body.blogTitle;
        //fetch and save the image
        // get the name of the file
        var imageName = req.files.image.name;
        // get the actual file (temporary file)
        var imageFile = req.files.image;
        // decide where to save it (should also check if the file exists and then rename it before saving or employ some logic to come up with unique file names)
        var imagePath = 'public/uploads/' + imageName;
        // move temp file to the correct folder (public folder)
        imageFile.mv(imagePath, function(err){
            console.log(err);
        });
        // create an object with the fetched data to send to the view
        var pageData = {
            description : description,
            imageName: imageName,
            blogTitle: blogTitle
        }
        // save data to database
        var myPost = new Post(pageData); // not correct yet, we need to fix it.
        myPost.save();

        // send the data to the view and render it
        res.render('addsuccess', {
            description : description,
            imageName: imageName,
            blogTitle: blogTitle,
            posts: posts // pass the posts for menu
        });
    }
  });
});

// for fetching one single post and displaying
myApp.get('/:postid', function(req,res){ 
    Post.find({}).exec(function(err, posts){  // fetch all the posts for menu
        var postId = req.params.postid;
        console.log(postId);
        Post.findOne({_id: postId}).exec(function(err,post){ // find the post with the id passed in the URL
            console.log('Error: ' + err);
            console.log('Post found: ' + post);

            if(post){
                res.render('post', {
                    description : post.description,
                    imageName : post.imageName,
                    blogTitle : post.blogTitle,
                    posts: posts
                });
            }
        });
    });
});

//deleting a post
myApp.get('/delete/:postid', function(req, res){
    // check if the user is logged in
    if(req.session.userLoggedIn){
        var postId = req.params.postid;
        console.log(postId);
        Post.findByIdAndDelete({_id: postId}).exec(function(err, post){
            res.render('delete', {message: 'Successfully deleted!'});
        });
    }
    else{
        res.render('delete', {message: 'Sorry, could not delete!'});
    }
});

myApp.get('/edit/:postid', function(req, res){
    // check if the user is logged in
    if(req.session.userLoggedIn){
        var postid = req.params.postid;
        console.log(postid);
        Post.findOne({_id: postid}).exec(function(err, post){
            console.log('Error: ' + err);
            console.log('Post: ' + post);
            if(post){
                res.render('edit', {post:post});
            }
            else{
                res.send('No blog found with that id...');
            }
        });
    }
    else{
        res.redirect('/login');
    }
});

myApp.post('/edit/:id', [
    check('blogTitle', 'Must have a blog title').not().isEmpty(),  
    check('description', 'Must have a description').not().isEmpty(),   
],function(req, res){

    const errors = validationResult(req);
    if (!errors.isEmpty()){
        console.log(errors); 
        var postid = req.params.id;
        Post.findOne({_id: postid}).exec(function(err, post){
            console.log('Error: ' + err);
            console.log('Post: ' + post);
            if(post){
                res.render('edit', {post:post, er:errors.array()});
            }
            else{
                res.send('No post found with that id...');
            }
        });
    }
    else{
        var description = req.body.description;
        var blogTitle = req.body.blogTitle;

        //fetch and save the image
        // get the name of the file
        var imageName = req.files.image.name;
        // get the actual file (temporary file)
        var imageFile = req.files.image;
        // decide where to save it (should also check if the file exists and then rename it before saving or employ some logic to come up with unique file names)
        var imagePath = 'public/uploads/' + imageName;
        // move temp file to the correct folder (public folder)
        imageFile.mv(imagePath, function(err){
            console.log(err);
        });

        var id = req.params.id;
        Post.findOne({_id:id}, function(err, post){
            post.blogTitle = blogTitle;
            post.description = description;
            post.imageName = imageName;
            post.save();     
        });

        Post.find({}).exec(function(err, posts){
        res.render('editsuccess', { //change to render post if it doesnt work like this
            description : description,
            imageName: imageName,
            blogTitle: blogTitle,
            posts: posts // pass the posts for menu
        });
    });
    }
});

// start the server and listen at a port
myApp.listen(8080);

//tell everything was ok
console.log('Everything executed fine.. website at port 8080....');
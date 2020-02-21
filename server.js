const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const knex = require('knex');

const db = knex({
    client: 'pg',   //pg for postgress
    connection: {
      host : '127.0.0.1', //same as localhost
      user : 'nicholaslooney',
      password : '',
      database : 'face-finder'
    }
  });

const app = express();

//REMEMBER to parse JSON data coming from the front end.
app.use(express.json());

//Eliminate CORS errors during development
app.use(cors());

app.get('/', (req, res) => {
    res.send(database.users);
})

//SIGN IN
//Using res.json() instead of res.send() returns a JSON response.
app.post('/signin', (req, res) => {
    return db.select('email', 'hash').from('login')
    .where('email', '=', req.body.email)
    .then(user => {
        const isValid = bcrypt.compareSync(req.body.password, user[0].hash);
        if (isValid) {
            return db.select('*').from('users')
                .where('email', '=', req.body.email)
                .then(user => {
                    res.json(user[0])
                })
                .catch(err => res.status(400).json('error getting user'))
            } else {
                res.status(400).json('wrong credentials')
            }
    })
    .catch(err => res.status(400).json('wrong credentials'))
})

//REGISTER
app.post('/register', (req, res) => {
    const { name, email, password } = req.body;
    
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(password, salt, function(err, hash) {
            // Store hash in your password DB.
            db.transaction(trx => { //create a transaction when performing multiple updates
                trx.insert({
                    hash: hash,
                    email: email
                })
                .into('login')
                .returning('email')
                .then(loginEmail => {
                    return trx('users')
                        .returning('*')
                        .insert({
                            email: loginEmail[0],
                            name: name,
                            joined: new Date()
                        })
                        .then(user => {
                            res.json(user[0]);
                        })
                    })
                    .then(trx.commit)
                    .catch(trx.rollback)
                })
                .catch(err => res.status(400).json('error registering')) 
        });
    });
    
 
})

//PROFILE
app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
    let found = false;
    db.select('*').from('users').where({ id }) //ES6 allows { id:id } to be written just { id } since property and value are same.
        .then(user => {
            if (user.length) {
                res.json(user[0]);
            } else {
                res.status(400).json('not found');
            }
        })
        .catch(err => res.status(400).json('error getting user'))
})

//IMAGE
app.put('/image', (req, res) => {
    const { id } = req.body;
    db('users')
        .where('id', '=', id)
        .increment('entries', 1)
        .returning('entries')
        .then(entries => {
            res.json(entries[0]);
        })
        .catch(err => res.status(400).json('error getting entries'))
})



app.listen(3000, () => {
    console.log('App is running');
})

//PLANNING
/*
1. GET  /                   Res: 'GET / is working'
2. POST /signin             Res: 'Success' or 'Fail'
3. POST /register           Res: new user object
4. GET  /profile/:userId    Res: user object
5. PUT  /image              Res: user object with updated count
*/

//For POST /signin: Why POST? 
//We don' want to send login info as a query string. 
//We want to send it inside of the body, ideally over HTTPS so that it is hidden from man-in-the-middle attacks.
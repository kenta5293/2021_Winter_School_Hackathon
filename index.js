// Server
const express = require('express');
const methodOverride = require('method-override');
// Crawling - Selenium
const webdriver = require('selenium-webdriver');
const By = require('selenium-webdriver').By;
var request = require('request');
// Account
const crypto = require('crypto');
const { urlencoded } = require('body-parser');
const session = require('express-session');

// MongoDB
require('./lib/mongoose');
const User = require('./models/User');

const app = express();
app.use(express.static('./public'));
app.use(express.json());
app.use(express.urlencoded());
app.use(methodOverride('_method'))


app.use(session({
  secret: 'ㅎㅇㅇㄱㄴㅁㅈㅇ',
  resave: false,
  saveUninitialized: true
}));
app.set('view engine', 'ejs');


app.get('/', async (req, res) => {
  const time = (60000*60)*6

  if ( req.session.event === undefined ) {
    let eventList = await syncEvent();
    req.session.event = eventList;
  }
  if ( req.session.rank === undefined ) {
    let rankList = await syncRank();
    req.session.rank = rankList;
  }

  setInterval( async () => {
    req.session.event = undefined;
    eventList = await syncEvent();
    req.session.event = eventList;

    req.session.rank = undefined;
    rankList = await syncRank();
    req.session.rank = rankList;

    if (req.session.user) {
      const todo = await User.findOne({_id: req.session.user._id}, {todoList: 1});
      res.render('main.ejs', { user: req.session.user, list: req.session.userChar, eventList: req.session.event, rankList: req.session.rank, todoList: todo });
    } else {
      res.render('main.ejs', { user: req.session.user, eventList: req.session.event, rankList: req.session.rank });
    }
  }, time);

  if (req.session.user) {
    const todo = await User.findOne({_id: req.session.user._id}, {todoList: 1});
    res.render('main.ejs', { user: req.session.user, list: req.session.userChar, eventList: req.session.event, rankList: req.session.rank, todoList: todo });
  } else {
    res.render('main.ejs', { user: req.session.user, eventList: req.session.event, rankList: req.session.rank });
  }
});


app.post('/search', async (req, res) => {
  const { body : { searchKeyword } } = req;
  const list = await syncChar(searchKeyword);
  console.log(list);
  if ( list === undefined || !list) {
    res.redirect(`/search/${searchKeyword}/?message=캐릭터를 찾지 못했습니다`);
  } else {
    req.session.search = list[0];
    res.redirect(`/search/${searchKeyword}`);
  }
})

app.get('/search/:username', async (req, res) => {
  const username = req.params.username;
  const { message } = req.query;
  if ( req.session.search === undefined || req.session.search.name != username  ) {
    const list = await syncChar(username);
    req.session.search = list[0];
  }
  res.render('searchProfile.ejs', { list: req.session.search, message });
})


// Login
app.get('/login', ( req, res ) => {
  const { message } = req.query;
  res.render('login.ejs', { message });
})
app.post('/login', async ( req, res ) => {
  const { body: { id, password } } = req;
  const eqw = crypto.createHash('sha512').update(id + 'geon' + password + 'hye').digest('base64');
  const data = await User.findOne({ id, password: eqw});

  if ( data ) {
    req.session.user = data;
    const list = await syncChar(req.session.user.charnick);
    const charList = list[0];
    req.session.userChar = charList;
    res.redirect('/');
  } else {
    res.redirect('/login/?message=로그인에 실패하였습니다.');
  }
});

// Logout
app.get('/logout', ( req, res ) => {
  req.session.user = undefined;
  req.session.userChar = undefined;
  res.redirect('/');
})

// Register
app.get('/register', ( req, res ) => {
  res.render('register.ejs');
})
app.post('/register', ( req, res ) => {
  const { body: { id, password, name, nickname, charnick }} = req;
  const eqw = crypto.createHash('sha512').update(id + 'geon' + password + 'hye').digest('base64');
  User.create({ id, password: eqw, name, nickname, charnick });
  res.redirect('/login')
})
app.get('/search/list/:username', async (req, res) => {
  const username = req.params.username;
  const list = await syncChar(username);
  res.json(list);
})

// TodoList add
app.post('/addTodo', async ( req, res ) => {
  const { body: { todoTitle, todoContent } } = req;
  let date = new Date();
  let year = date.getFullYear();
  let month = (date.getMonth()+1);
  let today = date.getDate();

  await User.updateOne({ _id: req.session.user._id }, { $push: { todoList: { title: todoTitle, content: todoContent, createYear: year, createMonth: month, createDay: today } } } );
  res.redirect('/');
})
// TodoList delete
app.delete('/delTodo/:todoId', async ( req, res ) => {
  const todoId = req.params.todoId;
  await User.updateOne({ _id: req.session.user._id }, { $pull: { todoList: { _id: todoId } } } );
  res.redirect('/')
})

// Character Crawling
const syncChar = async (username) => {
  const userDatas = [];
  let chartDatas = new Array();

  var chromeCapabilities = webdriver.Capabilities.chrome();
  var chromeOptions = {
    'args': ['headless', 'disable-gpu']
  };
  chromeCapabilities.set('chromeOptions', chromeOptions);
  const driver = new webdriver.Builder().withCapabilities(chromeCapabilities).build();

  let url = `https://maplestory.nexon.com/Ranking/World/Total?c=${username}`;
  await driver.get(url);
  try {    
    url = await driver.findElement(By.css('#container > div > div > div:nth-child(4) > div.rank_table_wrap > table > tbody > tr.search_com_chk > td.left > dl > dt > a')).getAttribute('href');
    await driver.get(url);
    await driver.findElement(By.css('#container > div.con_wrap > div.lnb_wrap > ul > li:nth-child(1) > a')).click();
  
    const level = await driver.findElement(By.css('#wrap > div.center_wrap > div.char_info_top > div.char_info > dl:nth-child(1) > dd')).getText();
    const charClass = await driver.findElement(By.css('#wrap > div.center_wrap > div.char_info_top > div.char_info > dl:nth-child(2) > dd')).getText();
    const popularity = await driver.findElement(By.css('#wrap > div.center_wrap > div.char_info_top > div.char_info > div.level_data > span.pop_data')).getText();
    const imgSrc = await driver.findElement(By.css('#wrap > div.center_wrap > div.char_info_top > div.char_info > div.char_img > div > img')).getAttribute('src');
    const serverName = await driver.findElement(By.css('#wrap > div.center_wrap > div.char_info_top > div.char_info > dl:nth-child(3) > dd')).getText();
    const serverImg =  await driver.findElement(By.css('#wrap > div.center_wrap > div.char_info_top > div.char_info > dl:nth-child(3) > dd > img')).getAttribute('src');
    const allRank = await driver.findElement(By.css('#container > div.con_wrap > div.contents_wrap > div > div > ul > li:nth-child(1) > dl > dd:nth-child(3)')).getText();
    const worldRank = await driver.findElement(By.css('#container > div.con_wrap > div.contents_wrap > div > div > ul > li:nth-child(2) > dl > dd:nth-child(3)')).getText();
    const classRank = await driver.findElement(By.css('#container > div.con_wrap > div.contents_wrap > div > div > ul > li:nth-child(3) > dl > dd:nth-child(3)')).getText();

    
    const chartElem = await driver.findElements(By.css('#container > div.con_wrap > div.contents_wrap > div > table > tbody > tr'));
    for(let i = 1; i <= chartElem.length; i++) {
      let chartDate = await driver.findElement(By.css(`#container > div.con_wrap > div.contents_wrap > div > table > tbody > tr:nth-child(${i}) > td.date`)).getText();
      let chartLevel = await driver.findElement(By.css(`#container > div.con_wrap > div.contents_wrap > div > table > tbody > tr:nth-child(${i}) > td:nth-child(6)`)).getText();
      let chartData = {
        'chartDate' : chartDate,
        'chartLevel' : chartLevel
      }
      chartDatas.push(chartData);
    }

    const userData = {
      'name' :  username,
      'level' : level,
      'class' : charClass,
      'popularity' : popularity,
      'imgSrc' : imgSrc,
      'serverName' : serverName,
      'serverImg' : serverImg,
      'allRank' : allRank,
      'worldRank' : worldRank,
      'classRank' : classRank,
      'chart' : chartDatas
    }
  
    userDatas.push(userData);
      
    await driver.close();
    await driver.quit();
    
    return userDatas;
    
  } catch (error) {
    console.log("exception: ", error);
    await driver.close();
    await driver.quit();
    return false;
  }
}

// Event Crawling
const syncEvent = async () => {
  let eventDatas = new Array();

  var chromeCapabilities = webdriver.Capabilities.chrome();
  var chromeOptions = {
    'args': ['headless', 'disable-gpu']
  };
  chromeCapabilities.set('chromeOptions', chromeOptions);
  const driver = new webdriver.Builder().withCapabilities(chromeCapabilities).build();

  let url = 'https://maplestory.nexon.com/News/Event';
  await driver.get(url);
  try {
    eventDatas = [];
    const eventElem = await driver.findElements(By.css('#container > div > div.contents_wrap > div.event_board > ul > li'));
    
    for(let i = 1; i <= eventElem.length; i++) {
      let eventImg = await driver.findElement(By.css(`#container > div > div.contents_wrap > div.event_board > ul > li:nth-child(${i}) > div > dl > dt > a > img`)).getAttribute('src');
      let eventName = await driver.findElement(By.css(`#container > div > div.contents_wrap > div.event_board > ul > li:nth-child(${i}) > div > dl > dd.data > p > a`)).getText();
      let eventUrl = await driver.findElement(By.css(`#container > div > div.contents_wrap > div.event_board > ul > li:nth-child(${i}) > div > dl > dt > a`)).getAttribute('href');
      
      let eventData = {
        'img' : eventImg,
        'name' : eventName,
        'url' : eventUrl
      }
      eventDatas.push(eventData);
    }

    await driver.close();
    await driver.quit();
    
    return eventDatas;
    
  } catch (error) {
    console.log("exception: ", error);
    await driver.close();
    await driver.quit();
    return false;
  }
}

// Rank Crawling
const syncRank = async () => {
  let rankDatas = new Array();

  var chromeCapabilities = webdriver.Capabilities.chrome();
  var chromeOptions = {
    'args': ['headless', 'disable-gpu']
  };
  chromeCapabilities.set('chromeOptions', chromeOptions);
  const driver = new webdriver.Builder().withCapabilities(chromeCapabilities).build();

  let url = 'https://maplestory.nexon.com/Ranking/World/Total';
  await driver.get(url);
  try {
    rankDatas = [];
    const rankElem = await driver.findElements(By.css('#container > div > div > div:nth-child(4) > div.rank_table_wrap > table > tbody > tr'));
    
    for(let i = 1; i <= rankElem.length; i++) {
      let rankImg = await driver.findElement(By.css(`#container > div > div > div:nth-child(4) > div.rank_table_wrap > table > tbody > tr:nth-child(${i}) > td.left > span > img:nth-child(1)`)).getAttribute('src');
      let rankServer = await driver.findElement(By.css(`#container > div > div > div:nth-child(4) > div.rank_table_wrap > table > tbody > tr:nth-child(${i}) > td.left > dl > dt > a > img`)).getAttribute('src')
      let rankName = await driver.findElement(By.css(`#container > div > div > div:nth-child(4) > div.rank_table_wrap > table > tbody > tr:nth-child(${i}) > td.left > dl > dt > a`)).getText();
      let rankLevel = await driver.findElement(By.css(`#container > div > div > div:nth-child(4) > div.rank_table_wrap > table > tbody > tr:nth-child(${i}) > td:nth-child(3)`)).getText();
      
      let rankData = {
        'img' : rankImg,
        'serverImg' : rankServer,
        'name' : rankName,
        'level' : rankLevel
      }
      rankDatas.push(rankData);
    }

    await driver.close();
    await driver.quit();
    
    return rankDatas;
    
  } catch (error) {
    console.log("exception: ", error);
    await driver.close();
    await driver.quit();
    return false;
  }
}

const port = 8000;
app.listen(port, () => {
  console.log(`server is running on port ${port}`);
})
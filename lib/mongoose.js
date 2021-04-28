const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/myMaple', {
  useNewUrlParser: true,
  useUnifiedTopology : true,
  useFindAndModify : false,
  useCreateIndex : true
}).then(() => {
  console.log('MongoDB is connected');
}).catch(err => {
  console.error(err);
})

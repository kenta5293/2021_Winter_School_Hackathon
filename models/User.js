const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    id: { type: String, required: true, unique: true},
    password: { type: String, required: true},
    name: { type: String, required: true },
    nickname: { type: String, required: true },
    charnick: { type: String, required: true },

    todoList: [{
        title: { type: String, required: true },
        content: { type: String, required: true },
        writer: { type: String, require: true },
        createYear: { type: Number, required: true },
        createMonth: { type: Number, required: true },
        createDay: { type: Number, required: true }
    }]
})
const User = mongoose.model('user', userSchema);

module.exports = User;

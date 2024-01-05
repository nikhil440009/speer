const noteModel = require("../models/noteModel");
const userModel = require("../models/userModel")
const shareModel = require("../models/shareModel")
const mongoose = require("mongoose");


exports.createNote = async (req, res) => {
    const { title, content } = req.body;
    console.log("sssss-- ", req.userId);
    try {
      const newNote = new noteModel({
        title,
        content,
        user: req.userId,
      });
      const savedNote = await newNote.save();
      res.status(201).json({
        messgae:"Note created successfully",
        data:savedNote
      });
    } catch (error) {
      res.status(500).json({ 
        message:"Internal server error",
        error: error.message
     });
    }
  };


  exports.getAllNotes = async (req, res) => {
    try {
      // Find notes owned by the authenticated user
      const userNotes = await noteModel.find({ user: req.userId });
  
      // Find shared notes using the Share model
      const sharedNotes = await shareModel.find({ sharedUser: req.userId }).populate('note');
  
      // Combine user's own notes and shared notes
      // const allNotes = [...userNotes, ...sharedNotes.map(share => share.note)];
  
      res.status(200).json({
        staus:"success",
        userNotes:userNotes,
        sharedNotes:sharedNotes
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };


// exports.getAllNotes = async (req, res) => {
//     try {
//       const notes = await noteModel.find({ user: req.userId });
//       res.json(notes);
//     } catch (error) {
//         res.status(500).json({
//             message:"Internal server error",
//              error: error.message
//              });
//     }
//   };

  exports.getNoteById = async (req, res) => {
    try {
      const note = await noteModel.findOne({ _id: req.params.id, user: req.userId });
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }
      res.json(note);
    } catch (error) {
        res.status(500).json({
            message:"Internal server error",
             error: error.message
             });
    }
  };


  exports.updateNoteById = async (req, res) => {
    const { title, content } = req.body;
    try {
      const updatedNote = await noteModel.findOneAndUpdate(
        { _id: req.params.id, user: req.userId },
        { title, content },
        { new: true }
      );
      if (!updatedNote) {
        return res.status(404).json({ error: 'Note not found' });
      }
      res.status(200).json({
        message:"Updated successfully",
        data: updatedNote
      });
    } catch (error) {
        res.status(500).json({
            message:"Internal server error",
             error: error.message
             });
    }
  };


  exports.deleteNoteById = async (req, res) => {
    try {
      const deletedNote = await noteModel.findOneAndDelete({ _id: req.params.id, user: req.userId });
      if (!deletedNote) {
        return res.status(404).json({ error: 'Note not found' });
      }
      res.json({
        message:"Delete successfully",
      });
    } catch (error) {
      res.status(500).json({
        message:"Internal server error",
         error: error.message
         });
    }
  };


// share notes

// exports.shareNote = async (req, res) => {
//     const { sharedUserId } = req.body;
//     const noteId = req.params.id;
  
//     try {
//       // Check if the note exists
//       const note = await noteModel.findOne({ _id: noteId, user: req.userId });
//       if (!note) {
//         return res.status(404).json({ error: 'Note not found' });
//       }
  
//       // Check if the user to share with exists
//       const sharedUser = await userModel.findById(sharedUserId);
//       if (!sharedUser) {
//         return res.status(404).json({ error: 'User not found' });
//       }
//       console.log("00 ",sharedUser);
//       note.sharedUsers = note.sharedUsers || [];

//       // Add shared user to the note's sharedUsers array
//       note.sharedUsers.push(sharedUserId);
//       const updatedNote = await note.save();
  
//       res.json(updatedNote);
//     } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: 'Internal Server Error' });
//     }
//   };


  
exports.shareNote = async (req, res) => {
    const { sharedUserId } = req.body;
    const noteId = req.params.id;
  
    try {
      // Check if the note exists
      const note = await noteModel.findOne({ _id: noteId, user: req.userId });
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }
  
      // Check if the user to share with exists
      const sharedUser = await userModel.findById(sharedUserId);
      if (!sharedUser) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Check if the note is already shared with the user
      const existingShare = await shareModel.findOne({ note: noteId, sharedUser: sharedUserId });
      if (existingShare) {
        return res.status(400).json({ error: 'Note already shared with this user' });
      }
  
      // Create a new share record
      const newShare = new shareModel({
        note: noteId,
        sharedUser: sharedUserId,
      });
  
      // Save the share record
      const savedShare = await newShare.save();
  
      res.status(200).json({
        status:"success",
        data:savedShare
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };


  //search notes



exports.searchNotes = async (req, res) => {


  
  try {

    const userId = req.userId;
    const query = req.query.q;
    
    if (!query) {
        return res.status(400).json({ error: 'Query parameter "q" is required.' });
    }
    
    const noteResults = await noteModel.find({
        user: userId,
        $or: [
            { title: { $regex: new RegExp(query, 'i') } },
            { content: { $regex: new RegExp(query, 'i') } },
        ],
    });
    
    const shareResults = await shareModel.aggregate([
        {
            $match: {
                'sharedUser':new  mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: 'notes', // Replace with the actual name of your noteModel collection
                localField: 'note',
                foreignField: '_id',
                as: 'noteData',
            },
        },
        {
            $unwind: '$noteData',
        },
        {
            $match: {
                $or: [
                    { 'noteData.title': { $regex: new RegExp(query, 'i') } },
                    { 'noteData.content': { $regex: new RegExp(query, 'i') } },
                ],
            },
        },
    ]);
    
    const combinedResults = [...noteResults, ...shareResults.map(share => share.noteData)];
    res.json(combinedResults);
    


    
} catch (error) {
    console.error(error);
    res.status(500).json({
        message: 'Internal Server Error',
        error: error.message,
    });
}


};

  
  
  
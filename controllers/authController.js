const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const registerUser = async (req, res) => {
    const { username, email, password} = req.body;

  try {
    const existingUser = await prisma.User.findUnique({
      where: {
        email: email,
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.User.create({
      data: {
        username,
        email,
        password_hash: passwordHash,
      },
    });

    const token = jwt.sign(
      {
        userId: newUser.id,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }    
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
      },
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
      const user = await prisma.User.findUnique({
          where: { email },
      });

      if (!user) {
          return res.status(400).json({ error: 'Invalid email or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
          return res.status(400).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
          { userId: user.id },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
      );

      res.status(200).json({
          message: 'Login successful',
          user: {
              id: user.id,
              username: user.username,
              email: user.email,
          },
          token,
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error during login' });
  }
};

module.exports = { registerUser, loginUser };

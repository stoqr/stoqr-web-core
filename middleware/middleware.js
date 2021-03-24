const jwt = require('jsonwebtoken');
const config = require('config');
const jwtSecret = config.get('jwtSecret');

module.exports = function (req, res, next) {
  //get token from header
  const token = req.header('x-auth-token');

  //check token
  if (!token) {
    return res
      .status(401)
      .json({ msg: 'Buraya erişim için yetkiniz bulunmamaktadır' });
  }

  //token exists, verify token
  try {
    const decodedToken = jwt.verify(token, jwtSecret);
    req.user = decodedToken.user;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ msg: 'Buraya erişim için yetkiniz geçerli değildir' });
  }
};

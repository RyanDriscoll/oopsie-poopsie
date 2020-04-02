export const absoluteUrl = (req, setLocalhost) => {
  let protocol = "https:";
  let host = req
    ? req.headers["x-forwarded-host"] || req.headers["host"]
    : window.location.host;
  if (host.indexOf("localhost") > -1) {
    if (setLocalhost) host = setLocalhost;
    protocol = "http:";
  }
  return {
    protocol: protocol,
    host: host,
    origin: protocol + "//" + host
  };
};

export const getColor = suit =>
  suit === "C" || suit === "S" ? "#000" : "#db0007";
export const getSource = suit => {
  switch (suit) {
    case "C":
      return "/images/club.png";
    case "H":
      return "/images/heart.png";
    case "S":
      return "/images/spade.png";
    case "D":
      return "/images/diamond.png";
  }
};

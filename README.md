# Gravity-Code

first merge your code with main

on the main branch 

on your machine, make sure the following 
any variavble with the value APP_BASE_URL

![image](https://user-images.githubusercontent.com/36309814/206835350-c99b11cd-aad3-49dd-af82-d3a622ad3cb5.png)

 is set to 
```
let APP_BASE_URL = 'http://44.201.113.49:5000/api/'
```

build the frontend,

in the frontend dir, run this code
```
npm run build
```
push the edits

from any ssh client
in the same folder that has the MyKey.pem file

```ssh -i "MyKey.pem" ubuntu@ec2-34-201-136-254.compute-1.amazonaws.com```

then run
```
cd /var/www/
sudo rm -r html
sudo mkdir html
cd /home/ubuntu/Gravity-Code/frontend/build
sudo cp -r . /var/www/html
sudo service nginx restart
```

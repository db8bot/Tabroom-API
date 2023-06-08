# Tabroom API

An API for computers to interact with the largest debate tabulation website Tabroom.com.

## Build from Source/Deploy
This project uses [Doppler](https://doppler.com) for secrets management. Create an account, project, and read key. The secrets fields are as follows:
```env
MONGOUSER=<db8bot's MongoDB cluster user>
MONGOPASS=<db8bot's MongoDB cluster password>
PORT=<If you wish to specify a port for it to run on. If your hosting provider does this automatically, do not create a PORT variable>
```
You can run the program just with the secrets above in the server's environment variable or run `npm run build` (or `npm run buildarm` if you are on ARM arch). You can deploy then deploy the built container anywhere you wish.

## Basic Usage & Features
The new version of this API doesn't have substantial coverage of Tabroom.com's functions. 
The goal of the recent rewrite was to build the API just around what db8bot would need. 
Currently endpoints include: 
* `/paradigm` - Grabs paradigm and round judged info of a judge.
* `/follow` - Gets a Tabroom account to follow a team.
* `/login` - Authenticate with Tabroom (Returns session token)
* `/tournamentinfo` - Get name, start, end & event from a tournament event link.

The old API had better coverage of Tabroom's functions, however, because the API is based on web-scraping, many functions no longer return accurate information. However, if you would like to reference the old API to build from, it is [here](https://github.com/db8bot/Tabroom-API/tree/781bd8f29ea58a3f1f8fcea417480d5170f71a6c)

## Contributors

* *AirFusion45* - Original Author
* *[D0ugins](https://github.com/D0ugins)* - Contributions to the authentication part of the API before rewrite

## License 
This Project is licensed under MIT License - see the LICENSE.md file for more details. The main points of the MIT License are:
  
  * This code can be used commercially
  * This code can be modified
  * This code can be distributed
  * This code can be used for private use
  * This code has no Liability
  * This code has no Warranty
  * When using this code, credit must be given to the author

## Privacy
See db8bot's privacy policy.

## Contact Me
Feel free to contact me if you find bugs, license issues, missing credits, etc.

  * Please contact me here:
    * Email: jim@db8bot.app
    * Discord: AirFusion#5112
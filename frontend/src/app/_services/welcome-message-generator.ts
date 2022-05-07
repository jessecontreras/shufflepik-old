import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WelcomeMessageGeneratorService {
  constructor() {}

  /**
   * Generates a welcome message
   * @returns
   */
  async generateWelcomeMessage() {
    try {
      const messages = [
        "I know you think I say this to everyone, but I think you're special. Let's make this official and connect your Discord to Shufflepik.",
        'Before you can upload anything to Shufflepik you gotta connect your Discord account. Lame huh? I know.',
        "There's a saying, if you give a person a fish you'll feed them for a day...how does the rest go? Connect Discord?",
        "Clearly you're a rockstar photographer, why haven't you connected your discord account to share all your wonderful pics?",
        'Connect your Discord account, that is all!',
        "If this were a movie you'd be the super hero who saves the day by connecting your Discord account to Shufflepik.",
        '1 + 1 = 2, but Shufflepik + Discord = Happy. So please connect your Discord account to Shufflepik.',
        'A person, another person, and another (different) person walk into a soda bar, they all connect their Discord accounts to Shufflepik.',
        "Look I don'\t want to tell you what to do but you have to connect your Discord account in order to upload pictures.",
        "Are you a Knicks fan? I'm sorry. You have no control of their ownership but you can control connecting your Discord to Shufflepik.",
        "What's weirder, Tom Brady not liking Stawberries or that you haven't connected your Discord to Shufflepik?",
        'I need more friends, please connect your Discord to Shufflepik',
        "If you're a Cleveland Browns fan then you need to connect Discord to Shufflepik...It's an easy win!",
        "I hope you're have a great day. Please connect Discord if you would like.",
      ];
      const index = Math.floor(Math.random() * messages.length) + 1;
      const welcomeMessage = messages[index];
      return welcomeMessage;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
} //end of service

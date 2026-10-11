/** Real life for Stop 10, Circuit Lab (shown as Stop 11). See types.ts and docs/CONTENT_GUIDE.md, “Real life”. */
import type { StopWorld } from './types';

export const S10_WORLD: StopWorld = {
  stop: 'Phones and computers are built from tiny switches that do AND, OR and NOT, billions of times a second.',
  lessons: {
    's10.l1': {
      why: 'Switches in a line make an AND: every one must be closed. Machines use this to stay safe until every part is ready.',
      uses: [
        { who: 'You, using a blender', kind: 'life', text: 'Many blenders have a switch under the lid and a start button, in a line. The blade spins only when the lid is locked and you press start.' },
        { who: 'Elevator repair workers', kind: 'work', text: 'An elevator has a switch on each door, wired in a line. If any door is open, its gap stops the power. Then the elevator will not move.' },
        { who: 'Print shop workers', kind: 'work', text: 'A big paper cutter has two buttons, far apart, wired in a line. The blade moves only when both are pressed. So both hands stay away from the blade.' },
      ],
    },
    's10.l2': {
      why: 'Switches side by side make an OR: any closed switch is enough. That is how many buttons can all do one job.',
      uses: [
        { who: 'You, at the doorbell', kind: 'life', text: 'Some homes have a bell button at the front door and one at the back. They are wired side by side. Press either one, and the bell rings.' },
        { who: 'Machine operators', kind: 'work', text: 'A long belt that carries boxes has a start button at each end. The two buttons are wired side by side. A worker at either end can start the belt.' },
        { who: 'Car mechanics', kind: 'work', text: 'In many cars, each door has a switch for the inside light, side by side. Open any door, or all of them, and the light comes on.' },
      ],
    },
    's10.l3': {
      why: 'A flipper box turns something on when its input is off. It lets a machine act when something is missing.',
      uses: [
        { who: 'You, at the fridge', kind: 'life', text: 'A fridge door presses a small switch when it is shut. The light is wired to do the opposite. Open the door, and the light comes on.' },
        { who: 'Street light crews', kind: 'work', text: 'A street light has a sensor that sees daylight. Its lamp does the opposite of the sensor. So when no daylight is seen, the lamp turns on.' },
        { who: 'Car makers', kind: 'work', text: 'The seat belt light in a car does the opposite of the buckle switch. With the car on, the light shines while the belt is not buckled.' },
      ],
    },
    's10.l4': {
      why: 'Two circuits do the same job only if they agree in every case. Check the whole table, not how they look.',
      uses: [
        { who: 'You, with a circuit kit', kind: 'life', text: 'You can wire two lamps that look nothing alike. Try every case of the switches. If the lamps always agree, the two circuits do the same job.' },
        { who: 'Robot builders', kind: 'work', text: 'A robot builder may swap one part of a circuit for a smaller one. First she checks every case. The motor must do the same thing in each.' },
        { who: 'Toy testers', kind: 'work', text: 'A new toy uses a different circuit than the old one. Testers press every mix of buttons on both. The lights must match every time.' },
      ],
    },
  },
  skills: {
    's10.series': [
      'A washing machine starts only when the door is shut and you press start. Both switches sit in a line, so one open switch stops it.',
      'A model train runs only when the main switch and the track switch are both on. If either is off, the train stays still.',
    ],
    's10.parallel': [
      'Many electric stoves have one light that shows a burner is on. The burner switches are side by side, so any burner, or all of them, lights it.',
      'In a game, a red button and a blue button both open the gate. Pressing both still opens it.',
    ],
    's10.not': [
      'An oven’s preheat light stays on while the oven is not hot enough. When it reaches the heat you set, the light goes off.',
      'A printer’s paper light comes on when its paper sensor feels no paper. The light does the opposite of the sensor.',
    ],
    's10.match': [
      'Before swapping one circuit for another, engineers fill in both tables. If the lamps agree in every row, the swap is safe.',
      'Two light switch layouts can look different and still work the same. Testing every case is how you know.',
    ],
  },
};

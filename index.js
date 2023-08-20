const easymidi = require('easymidi');
const { exec } = require('child_process');

const VIRTUAL_PORT = "MyDMX"
const DEVICE_PORT = "APC MINI"
const EXIT_NOTE = 0
const MIDI_MESSAGE_TYPES = ['noteon', 'noteoff', 'cc']

const LOOPMIDI_PATH = '"C:/Program Files (x86)/Tobias Erichsen/loopMIDI/loopMIDI.exe"'

let midiPorts

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function init() {
  exec(LOOPMIDI_PATH, async (error, stdout, stderr) => {
    if (error) {
      throw new Error('Unable to run virtual midi software. Is it installed on the computer ?\n' + error)
    }
  })
  await sleep(1000)
  midiPorts = {
    Output: new easymidi.Output(VIRTUAL_PORT),
    Input: new easymidi.Input(VIRTUAL_PORT),
    APCIn: new easymidi.Input(DEVICE_PORT),
    APCOut: new easymidi.Output(DEVICE_PORT)
  }
  midiPorts.Output.send("cc", {
    channel: 2,
    value: 0,
    controller: 0
  })
  return midiPorts
}

function startTunnel(midiPorts) {

  MIDI_MESSAGE_TYPES.forEach((value) => {
    midiPorts.APCIn.on(value, (msg) => {
      midiPorts.Output.send(value, {
        note: msg.note,
        velocity: msg.velocity,
        channel: msg.channel,
        value: msg.value,
        controller: msg.controller
      })
      console.log(`Recieved from ${DEVICE_PORT} :`, msg);
    })
  })

  MIDI_MESSAGE_TYPES.forEach((value) => {
    midiPorts.Input.on(value, (msg) => {
      midiPorts.APCOut.send(value, {
        note: msg.note,
        velocity: msg.velocity,
        channel: msg.channel,
        value: msg.value,
        controller: msg.controller
      })
      console.log(`Recieved from ${VIRTUAL_PORT} :`, msg);
    })
  })

  //const next = prompt('Appuyez sur une touche pour continuer...');


//   APCIn.on('noteon', (msg) => {
//     if (msg.note == EXIT_NOTE) {
//       close()
//       midivirtual.kill('SIGHUP');
//       console.log("End.");
//     }
//   })

}

async function sendPause(){
    midiPorts.Output.send('noteon', {
        channel : 0,
        note : 99,
        velocity : 127
    })
    await sleep(60)
    midiPorts.Output.send('noteon', {
        channel : 0,
        note : 100,
        velocity : 127
    })
    await sleep(300)
        midiPorts.Output.send('noteon', {
        channel : 0,
        note : 98,
        velocity : 127
    })
    midiPorts.Output.send('noteon', {
        channel : 0,
        note : 99,
        velocity : 127
    })
    midiPorts.Output.send('noteon', {
      channel : 0,
      note : 100,
      velocity : 127
  })
}

let storedValues = {}
let aliasNotes = [] //{from : 28, to : 1}
let conditionnalEmit = [{on : 3, if :1, then :28}]

function defineEvents(){
    sendPause()
    midiPorts.APCIn.on('noteon', async (e) => {
        await sleep(100)
        if (e.note == 98){
            sendPause()
            console.log("sent !")
        }
    })
    midiPorts.Input.on('noteon', (e) => {
        if (e.channel == 1){
            storedValues[e.note] = e.velocity
            console.log(`Stored note ${e.note} to value ${e.velocity}`)
        }
        // if (e.channel == 0){
        //     aliasNotes.forEach((elem) => {
        //         if (e.note == elem.from){
        //             storedValues[elem.to] = e.velocity
        //             console.log(`Stored note ${elem.to} to value ${e.velocity}`)
        //         }
        //     })
        // }
        conditionnalEmit.forEach(async (elem) => {
            if (e.channel == 1 && e.note == elem.on && storedValues[elem.if] == 127){
                midiPorts.Output.send('noteon', {
                    channel : 0,
                    note : elem.then,
                    velocity : 127
                })
                await sleep(50)
                midiPorts.Output.send('noteon', {
                    channel : 0,
                    note : elem.then,
                    velocity : 127
                })
            }
        })
    })
}

function close() {
  midiPorts.Input.close();
  midiPorts.Ouput.close();
  midiPorts.APCIn.close();
  midiPorts.APCOut.close();
}

init().then(startTunnel).then(defineEvents)

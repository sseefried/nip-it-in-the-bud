//
// A Finite State Machine (FSM) simulator.
//
// The FSM specification "spec" fully specifies a finite state machine.
// The object "obj" must contain a field (with the value of "selector") representing the state
// the FSM is currently in.
//
// The spec has the following form:
//    spec = {
//      <eventType1>:
//        {
//          <state1>: { unconditional: ...,
//                      conditionals: [ { transition: ..., nextState: ... }
//                                    , { transition: ..., nextState: ... } ]
//
//          <state2>: ...
//        },
//      <eventType2>: { ... }
//    }
//
//
// The state of the FSM can be advanced by many different event types. (e.g. "touch", "keypress"
// "frame updated")
//
// For each event type we have a "transition object". The transition object is a hash mapping
// FSM states to a "transition descriptor". Each transition descriptor consists of an
// a) an unconditional action
// b) a list of conditional transitions.
//
// In detail:
//
// a) An unconditional is a function of the form "function(obj) { ... }".
//    It shouldn't return anything. It is always run before any of the conditionals.
//
// b) The conditionals consist of a transition function and a nextState. The transition function
//    is of the form "function(obj) { ... }". They should all return "true" or "false".
//    If they return "true" then the state of the FSM is updated the value of "nextState".
//    If they return "false" they should do nothing. A conditional is usually of the form:
//
//    function(obj) {
//       if ( <some condition> ) {
//         <do something. update obj appropriately for next FSM state>
//         return true;
//       } else {
//         return false;
//       }
//    }
//

var FSM = function(selector, spec) {

  // Call the function returned to advance the FSM
  return (function(obj, eventType) {
    var i, ts, state = obj[selector], transitions;

    transitions = spec[eventType];

    if ( transitions[state].unconditionals ) {
      for (i in transitions[state].unconditionals ) {
        transitions[state].unconditionals[i](obj);
      }
    }

    for (i in ts = transitions[state].conditionals ) {
      if ( ts[i].transition(obj) ) {
        obj[selector] = ts[i].nextState
        break;
      }
    }
  });

};
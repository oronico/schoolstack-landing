document.addEventListener('DOMContentLoaded', function() {
  var form = document.getElementById('signupForm');
  if (!form) return;
  var box = document.getElementById('signup');
  var btn = document.getElementById('submitBtn');
  var errorEl = document.getElementById('formError');
  var successEl = document.getElementById('formSuccess');
  var label = btn.textContent;

  var VIEW = {
    idle:       { form: true,  busy: false, error: false, success: false },
    submitting: { form: true,  busy: true,  error: false, success: false },
    failed:     { form: true,  busy: false, error: true,  success: false },
    submitted:  { form: false, busy: false, error: false, success: true }
  };
  var ON = {
    idle:       { SUBMIT: 'submitting' },
    submitting: { SUCCEED: 'submitted', FAIL: 'failed' },
    failed:     { SUBMIT: 'submitting' },
    submitted:  {}
  };
  var state = 'idle';

  function send(event) {
    var next = ON[state][event];
    if (!next) return false;
    state = next;
    var v = VIEW[state];
    box.setAttribute('data-state', state);
    form.hidden = !v.form;
    btn.disabled = v.busy;
    btn.textContent = v.busy ? 'Submitting...' : label;
    errorEl.hidden = !v.error;
    successEl.hidden = !v.success;
    return true;
  }

  function writeError() {
    errorEl.textContent = '';
    errorEl.appendChild(document.createTextNode(
      "We couldn't add you to the list. Your answers are still here. Please try again or email "));
    var link = document.createElement('a');
    link.href = 'mailto:allison@schoolstack.ai';
    link.textContent = 'allison@schoolstack.ai';
    errorEl.appendChild(link);
    errorEl.appendChild(document.createTextNode('.'));
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (!send('SUBMIT')) return;

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    })
    .then(function(res) {
      if (!res.ok) throw new Error('rejected');
      send('SUCCEED');
      var heading = document.getElementById('successHeading');
      if (heading) heading.focus();
    })
    .catch(function() {
      writeError();
      send('FAIL');
    });
  });

  box.setAttribute('data-state', state);
});

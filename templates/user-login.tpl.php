<section>
  <a href="/twitter/redirect" class="twitter">
    <i class="icon-twitter"></i> Log in with Twitter
  </a>
  <span class="or-separator"> or </span>
  <hr class="separator"></hr>
  <?php print $username; ?>
  <div class="password">
    <?php print $password; ?>
    <?php print l('<i class="icon-question-sign"></i>', 'user/password', array('attributes'=>array('title'=>'Forgotten your password?'), 'html'=>true)); ?>
  </div>
  <?php print $form; ?>
</section>


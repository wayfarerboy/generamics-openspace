<section>
  <?php print $username; ?>
  <div class="password">
    <?php print $password; ?>
    <?php print l('<i class="icon-question-sign"></i>', 'user/password', array('attributes'=>array('title'=>'Forgotten your password?'), 'html'=>true)); ?>
  </div>
  <?php print $form; ?>
</section>


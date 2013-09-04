<?php

namespace Hexmedia\AdministratorBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;

class EditModeController extends Controller
{
    public function enableAction()
    {
        $this->enable();

        return $this->redirect($this->getRequest()->headers->get('referer'));
    }

    private function enable()
    {
        $this->getRequest()->getSession()->set("hexmedia_content_edit_mode", true);
    }

    public function disableAction()
    {
        $this->disable();

        return $this->redirect($this->getRequest()->headers->get('referer'));
    }

    private function disable()
    {
        $this->getRequest()->getSession()->set("hexmedia_content_edit_mode", false);
    }

    public function saveAndExitAction()
    {
        $this->disable();
        $this->save();
        return $this->redirect($this->getRequest()->headers->get('referer'));
    }

    public function saveAction()
    {
        $this->save();
        return $this->redirect($this->getRequest()->headers->get('referer'));
    }

    private function save()
    {
        //Here should go some listener which will allow other bundles to do some actions on it.
    }
}

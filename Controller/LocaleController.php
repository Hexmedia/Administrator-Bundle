<?php

namespace Hexmedia\AdministratorBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Template;

class LocaleController extends Controller
{
    /**
     * @Template()
     */
    public function changeAction($loc)
    {
        $session = $this->get('session');

        //FIXME: Need to check if locale is allowed.
        $session->set('locale', $loc);

        return $this->redirect(/*$this->getRefererUrl() ? $this->getRefererUrl() :*/ $this->get('router')->generate("homepage"));
    }

    public function getRefererUrl()
    {
        $request = $this->getRequest();

        //look for the referer route
        $referer = $request->headers->get('referer');
        $lastPath = substr($referer, strpos($referer, $request->getBaseUrl()));

        return $lastPath;
    }
}
